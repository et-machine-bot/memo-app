# backend

Go API 用のモジュール置き場。このディレクトリの現時点の成果物は PostgreSQL マイグレーションのみ。

メモ CRUD ハンドラ（EAS-93）はここには含まない。`go.mod` は後続の API 実装が同じモジュールパスを使えるように置いた足場である。

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

接続先は環境変数で渡す。パスワードやホストをリポジトリに書かない。

| 変数 | 説明 |
| --- | --- |
| `POSTGRES_HOST` | ホスト。Compose ネットワーク内は `db`、ホスト側から公開ポートへ繋ぐときは `localhost` |
| `POSTGRES_PORT` | ポート。通常 `5432` |
| `POSTGRES_USER` | ユーザー |
| `POSTGRES_PASSWORD` | パスワード |
| `POSTGRES_DB` | データベース名 |
| `DATABASE_URL` | golang-migrate に渡す接続文字列 |

Compose のサービス名・ポートは Infra（EAS-91）が用意する。典型値はホスト `db` または `localhost`、ポート `5432`。

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_DB=memo

export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable"
```

`POSTGRES_PASSWORD` の例はローカル開発用のプレースホルダ。本番の値は Secrets Manager などから注入する。

CLI の例（モジュールルートは `backend/`）:

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.20.1

migrate -path migrations -database "$DATABASE_URL" up
migrate -path migrations -database "$DATABASE_URL" down 1
```

リポジトリルートから実行する場合は `-path backend/migrations` にする。

- `up` で `memos` とインデックスを作成する
- `down 1` でインデックスとテーブルを削除する（golang-migrate の `schema_migrations` はツール側が管理する）

バージョン確認:

```bash
migrate -path migrations -database "$DATABASE_URL" version
```
