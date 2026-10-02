# infra

| パス | 内容 |
| --- | --- |
| [`docker/`](docker/) | コンテナイメージ。ローカル Compose 用 Dockerfile は EAS-91。本番の Go API は [`docker/backend.prod.Dockerfile`](docker/backend.prod.Dockerfile) |
| [`terraform/`](terraform/) | 本番 AWS（EAS-96）。手順は [terraform/README.md](terraform/README.md) |

Terraform は `docker-compose.yml` やローカル用 Dockerfile を変更しません。
