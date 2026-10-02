# backend

Go API（`cmd/server`）と PostgreSQL マイグレーション。

メモ CRUD は `/api` 配下です。ルータは EAS-91 の `net/http` ServeMux のままです。`content` は trim し、空と 10,000 文字超は `400` です。UPDATE は `updated_at` を必ず現在時刻にします。

## API

| Method | Path | 成功 |
| --- | --- | --- |
| GET | `/api/health` | `200` `{"status":"ok"}` |
| GET | `/api/memos` | `200` `Memo[]`（`updated_at` 降順） |
| GET | `/api/memos/{id}` | `200` `Memo` |
| POST | `/api/memos` | `201` `Memo` |
| PUT | `/api/memos/{id}` | `200` `Memo` |
| DELETE | `/api/memos/{id}` | `204` 空ボディ |

`Memo` は `id`（uuid）、`content`、`created_at`、`updated_at`（RFC3339）です。失敗時:

```json
{ "error": { "code": "validation_error", "message": "content is required" } }
```

`code` は `validation_error`（400）、`not_found`（404）、`internal_error`（500）です。500 の詳細はサーバログだけに出します。

マイグレーション適用後の例（`HTTP_ADDR` の既定は `:8080`）:

```bash
curl -sS -X POST http://localhost:8080/api/memos \
  -H 'Content-Type: application/json' \
  -d '{"content":"hello"}'

curl -sS http://localhost:8080/api/memos
curl -sS http://localhost:8080/api/memos/<id>

curl -sS -X PUT http://localhost:8080/api/memos/<id> \
  -H 'Content-Type: application/json' \
  -d '{"content":"updated"}'

curl -sS -D - -o /dev/null -X DELETE http://localhost:8080/api/memos/<id>
```

## スキーマ

テーブル `memos`（PostgreSQL 16 想定）:

| カラム | 型 | 制約 |
| --- | --- | --- |
| `id` | `UUID` | PRIMARY KEY、`DEFAULT gen_random_uuid()` |
| `content` | `TEXT` | `NOT NULL`、`btrim(content) <> ''` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` |

- 一覧用インデックス: `memos_updated_at_desc_idx`（`updated_at DESC`）
- ソフトデリートなし
- `gen_random_uuid()` は PostgreSQL 13 以降の組み込み関数（pgcrypto 不要）
- `updated_at` のデフォルトは INSERT 時のみ。UPDATE 時の更新は API 側の責務
- 空白のみの `content` は CHECK で拒否する。最大長 10,000 文字の検証は API が正

マイグレーションツールは [golang-migrate](https://github.com/golang-migrate/migrate)。SQL は `migrations/`。

## マイグレーションの適用

接続先は [`.env.example`](../.env.example) をコピーして組み立てる。パスワードはリポジトリの別ファイルに書かない。

```bash
cp .env.example .env
docker compose up -d db
set -a && . ./.env && set +a

# ホストから公開ポートへ。DB_* は .env.example のホスト用（DB_HOST=localhost）。
# DB_USER / DB_PASSWORD / DB_NAME は POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB と同じ。
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"

go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.20.1
migrate -path migrations -database "$DATABASE_URL" up
migrate -path migrations -database "$DATABASE_URL" down 1
```

リポジトリルートから実行する場合は `-path backend/migrations` にする。

Compose ネットワーク内から適用する場合はホストを `db`、ポートを `5432` にする。ユーザー・パスワード・DB 名は `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` を使う。

- `up` で `memos` とインデックスを作成する
- `down 1` でインデックスとテーブルを削除する（golang-migrate の `schema_migrations` はツール側が管理する）

バージョン確認:

```bash
migrate -path migrations -database "$DATABASE_URL" version
```
