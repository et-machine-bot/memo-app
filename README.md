# memo-app

メモアプリのモノレポです。ローカルでは Docker Compose で frontend / backend / PostgreSQL を起動します。

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

## URL とポート

| サービス | ホストから | コンテナ内 |
| --- | --- | --- |
| Frontend | http://localhost:5173 | `frontend:5173` |
| Backend | http://localhost:8080 | `backend:8080` |
| PostgreSQL | `localhost:5432` | `db:5432` |

ヘルスチェック: http://localhost:8080/api/health

成功時のレスポンスは `{"status":"ok"}` です。Postgres に届かないときは `503` と `{"status":"unavailable"}` を返します。

## サービス同士の見つけ方

ブラウザは Compose の DNS 名を解決できません。frontend が呼ぶ API は、ホストに公開した backend の URL です。

- Frontend → Backend: 環境変数 `VITE_API_BASE_URL`（既定 `http://localhost:8080`）。Vite が開発サーバ起動時に読みます。
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
frontend/                 React + TypeScript (Vite)
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

## API

メモ CRUD は既存の `net/http` ServeMux に載っています。接続先は `DB_*`、待ち受けは `HTTP_ADDR`、CORS は `CORS_ORIGIN` です。マイグレーション適用前は CRUD が 500 になります。エンドポイントと curl は [backend/README.md](backend/README.md) です。

- `GET /api/health` … `200` `{"status":"ok"}`。Postgres に届かないときは `503` `{"status":"unavailable"}`
- `GET /api/memos` … `updated_at` 降順
- `GET /api/memos/{id}` / `POST /api/memos` / `PUT /api/memos/{id}` / `DELETE /api/memos/{id}`
