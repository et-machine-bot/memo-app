# frontend

メモ CRUD の React UI です。一覧・作成・編集・削除は Backend API（`VITE_API_BASE_URL`、既定 `http://localhost:8080`）を呼びます。起動手順と画面の見方はリポジトリ直下の README を参照してください。

```bash
npm install
npm run dev
```

Backend と PostgreSQL が先に起動し、マイグレーションが適用されている必要があります。接続先を変えるときは `frontend/.env` に `VITE_API_BASE_URL` を書き、Vite を起動し直します。
