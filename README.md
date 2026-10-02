# memo-app

短いテキストメモを作成・一覧・編集・削除する Web アプリです。ローカルでは Docker Compose で frontend / backend / PostgreSQL を起動します。

Frontend の画面は Backend のメモ CRUD API を呼びます。一覧の読み込み中・空・失敗、保存失敗、削除失敗は API の結果で切り替わります。

本番の AWS 構成（S3 + CloudFront、ECS Fargate + ALB、RDS PostgreSQL）は [infra/terraform/README.md](infra/terraform/README.md) です。適用手順はそちらにあり、この README の Compose 手順とは別です。

## 起動

```bash
cp .env.example .env
docker compose up --build
```

メモ CRUD を使う前に、下の「マイグレーション」を適用します。未適用のまま一覧を開くと、Backend が 500 を返し、画面は失敗表示になります。

初回はイメージのビルドと `npm ci` があるため、frontend がポートを開くまで少し待ちます。別ターミナルで状態を見る場合:

```bash
docker compose ps
```

停止:

```bash
docker compose down
```

データベースのボリュームも消す場合は `docker compose down -v` です。

API と画面を分けて起動する場合は、先に Backend と PostgreSQL を上げてマイグレーションを適用し、frontend はホストで開発サーバを起動します。`VITE_API_BASE_URL` はブラウザから届く Backend の URL です（既定 `http://localhost:8080`）。

```bash
cp .env.example .env
docker compose up --build db backend
set -a && . ./.env && set +a
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
migrate -path backend/migrations -database "$DATABASE_URL" up

cd frontend
npm install
npm run dev
```

`frontend/.env` に `VITE_API_BASE_URL=http://localhost:8080` を置いても同じです。未設定ならコードの既定値がその URL です。ポートを変えたら `.env` の `VITE_API_BASE_URL` と `CORS_ORIGIN` を合わせ、Vite を起動し直してください。

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

Frontend は `VITE_API_BASE_URL` の `/api/memos` を使います。メモが無いときは空状態、取得中は読み込み、Backend に届かないか 5xx のときは失敗と再試行です。

| URL | 内容 |
| --- | --- |
| `/` | メモ一覧（`updated_at` 降順） |
| `/new` | 新規作成。空や空白だけの内容は保存できない |
| `/memos/{id}/edit` | 編集。存在しない id は「メモが見つかりません」 |

保存中はボタンが「保存中…」になり、成功すると「メモを保存しました」または「メモを更新しました」を表示します。保存や削除がネットワークで失敗したときは、その場で再試行できます。全件削除で空状態になります。

マイグレーション未適用のまま CRUD を呼ぶと Backend は 500 を返し、一覧は失敗表示になります。

## サービス同士の見つけ方

ブラウザは Compose の DNS 名を解決できません。frontend が呼ぶ API は、ホストに公開した backend の URL です。

- Frontend → Backend: 環境変数 `VITE_API_BASE_URL`（既定 `http://localhost:8080`）。Vite が開発サーバ起動時に読み、ブラウザが `GET/POST/PUT/DELETE /api/memos` を呼びます。
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
infra/docker/             ローカル用 Dockerfile と本番用 backend.prod.Dockerfile
infra/terraform/          本番 AWS（Terraform）
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

## API

メモ CRUD は既存の `net/http` ServeMux に載っています。接続先は `DB_*`、待ち受けは `HTTP_ADDR`、CORS は `CORS_ORIGIN` です。マイグレーション適用前は CRUD が 500 になります。エンドポイントと curl は [backend/README.md](backend/README.md) です。

- `GET /api/health` … `200` `{"status":"ok"}`。Postgres に届かないときは `503` `{"status":"unavailable"}`
- `GET /api/memos` … `updated_at` 降順
- `GET /api/memos/{id}` / `POST /api/memos` / `PUT /api/memos/{id}` / `DELETE /api/memos/{id}`