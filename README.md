# memo-app

メモアプリのモノレポです。

- ローカル開発（Docker Compose）は EAS-91 です。この変更は Compose のファイルを追加・変更しません。
- 本番 AWS（S3 + CloudFront、ECS Fargate + ALB、RDS PostgreSQL）の定義と適用手順は [infra/terraform/README.md](infra/terraform/README.md) です。
