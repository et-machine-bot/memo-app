# memo-app

短いテキストメモを作成・一覧・編集・削除する Web アプリです。ローカルでは Docker Compose で frontend / backend / PostgreSQL を起動します。

Frontend の画面（EAS-94）はインメモリのモックデータで動きます。API 接続は EAS-95 です。

本番の AWS 構成（S3 + CloudFront、ECS Fargate + ALB、RDS）はこのリポジトリの別タスクです。この README の手順に Terraform は含まれません。

## 起動

```bash
cp .env.example .env
docker compose up --build
```

初回はイメージのビルドと `npm ci` があるため、frontend がポートを開くまで少し待ちます。別ターミナルで状態を見る場合:

```bash
docker compose ps
```

停止:

```bash
docker compose down
```

データベースのボリュームも消す場合は `docker compose down -v` です。

Compose を使わず frontend だけ起動する場合:

```bash
cd frontend
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

## URL とポート

| サービス | ホストから | コンテナ内 |
| --- | --- | --- |
| Frontend | http://localhost:5173 | `frontend:5173` |
| Backend | http://localhost:8080 | `backend:8080` |
| PostgreSQL | `localhost:5432` | `db:5432` |

ヘルスチェック: http://localhost:8080/api/health

成功時のレスポンスは `{"status":"ok"}` です。Postgres に届かないときは `503` と `{"status":"unavailable"}` を返します。

## 画面の確認

Frontend はモックのメモ CRUD です。

| URL | 内容 |
| --- | --- |
| `/` | メモ一覧（最初に読み込み表示のあと、モック4件） |
| `/?list=empty` | 空状態 |
| `/?list=loading` | 読み込み中（約4秒） |
| `/?list=error` | 読み込み失敗。再試行で一覧へ |
| `/new` | 新規作成。空の内容は保存できない |
| `/new?saveError=1` | 最初の保存だけ失敗し、再試行で成功 |
| `/memos/11111111-1111-4111-8111-111111111111/edit?saveError=1` | 更新失敗と再試行 |

`list` と `saveError` はページを開いたときのデモ用です。通常の操作では、全件削除で空状態、保存中はボタンが「保存中…」になり、成功すると「メモを保存しました」を表示します。

## サービス同士の見つけ方

ブラウザは Compose の DNS 名を解決できません。frontend が呼ぶ API は、ホストに公開した backend の URL です。

- Frontend → Backend: 環境変数 `VITE_API_BASE_URL`（既定 `http://localhost:8080`）。Vite が開発サーバ起動時に読みます。EAS-94 の画面はまだこの URL へ通信しません。
- Backend → PostgreSQL: Compose が backend コンテナに `DB_HOST=db` と `DB_PORT=5432` を渡します。アプリは `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_SSLMODE` から接続先を決めます。
- CORS: backend は `CORS_ORIGIN`（既定 `http://localhost:5173`）を許可します。

`FRONTEND_PORT` を変えたら `CORS_ORIGIN` も合わせてください。`BACKEND_PORT` を変えたら `VITE_API_BASE_URL` も合わせ、frontend コンテナを作り直してください（`docker compose up --build frontend`）。

## 環境変数

一覧とコメントは [`.env.example`](.env.example) にあります。`.env` は git に含めません。

ホスト上で API だけ動かして Compose の Postgres を使う例:

```bash
docker compose up -d db
set -a && . ./.env && set +a
cd backend && go run ./cmd/server
```

`.env` の `DB_HOST` はホスト用に `localhost` です。Compose 内の backend は常に `db` を使うため、この値では上書きされません。

## 開発時の反映

- `frontend/`: ソースをマウントし、Vite の開発サーバがホットリロードします。
- `backend/`: ソースをマウントし、[air](https://github.com/air-verse/air) が `.go` の変更で再ビルドします。
- `db`: 名前付きボリューム `memo_pg_data` にデータを残します。アプリ用ロールは `POSTGRES_USER`（既定 `memo`）です。コンテナの OS ユーザは root ではなく `postgres` です。

## レイアウト

```
frontend/                 React + TypeScript (Vite)。メモ CRUD UI
backend/                  Go API
  cmd/server/             エントリポイント
  internal/config/        環境変数
  internal/handler/       HTTP
  internal/store/         PostgreSQL 接続
  migrations/             golang-migrate（memos）
infra/docker/             ローカル用 Dockerfile
docker-compose.yml
.env.example
```

## マイグレーション

`memos` の SQL は `backend/migrations/` にあります。適用手順の詳細は [backend/README.md](backend/README.md) です。

ホストから公開ポートの Postgres へ適用する例:

```bash
cp .env.example .env
docker compose up -d db
set -a && . ./.env && set +a
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
migrate -path backend/migrations -database "$DATABASE_URL" up
```

`DB_USER` / `DB_PASSWORD` / `DB_NAME` は `.env.example` の `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` と同じです（ユーザーと DB 名は `memo`）。`DB_HOST` はホスト用の `localhost` です。

## Backend への引き継ぎ

- 接続情報は上記の `DB_*` を使ってください。Compose 内のホスト名は `db`、ポートは `5432` です。
- 成功時の `GET /api/health` は `{"status":"ok"}` のままにしてください。Postgres への ping を含みます。
- CRUD のパスは `/api/memos` です。ルータは chi を推奨します。このスタブは標準ライブラリの `net/http` だけです。
