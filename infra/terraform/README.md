# 本番 AWS（Terraform）

メモアプリの本番構成です。アーキテクチャは [EAS-88](https://linear.app/easy-tech/issue/EAS-88) の確定案に合わせています。

- Frontend: S3 + CloudFront（プライベートバケット、Origin Access Control）
- Backend: ECS Fargate + Application Load Balancer
- Database: RDS PostgreSQL 16（プライベートサブネット、暗号化、`rds.force_ssl`）
- 秘密情報: Secrets Manager（DB 認証情報とアプリ用シークレット）
- ログ: CloudWatch Logs（ECS タスクの標準出力）
- 権限: タスク実行ロールは ECR の pull、このロググループへの書き込み、2 つのシークレットの読み取りだけ。タスクロールにポリシーは付けていません。

このディレクトリを apply するまで、AWS アカウントには何も作りません。認証情報やアカウント ID はリポジトリに置きません。

## 構成

```
[Browser]
    |  HTTPS
    v
[CloudFront: frontend] ---- S3 (Vite の dist)
    |
    |  HTTPS  VITE_API_BASE_URL
    v
[CloudFront: api] --HTTP--> [ALB] --> [ECS Fargate: Go] --5432--> [RDS PostgreSQL]
```

ブラウザのページは HTTPS です。ALB は HTTP なので、そのまま呼ぶと mixed content になります。API 用の CloudFront が TLS を終端し、オリジンの ALB へは AWS 内の HTTP で転送します。カスタムドメインと ACM 証明書は後から差し替えできます。

CORS はフロントの CloudFront オリジンだけを許可します。Terraform がタスクの `CORS_ORIGIN` に `cloudfront_url` を入れます。

## 作られるもの

| 領域 | リソース |
| --- | --- |
| ネットワーク | VPC、パブリック / プライベートサブネット（AZ 2 つ）、Internet Gateway、ルートテーブル。NAT Gateway は prod のみ |
| セキュリティグループ | ALB は 80 を公開。ECS の 8080 は ALB からのみ。RDS の 5432 は ECS からのみ。ECS の外向きは 443、VPC 内 DNS、RDS だけ |
| RDS | PostgreSQL 16、`db.t4g.micro`、gp3 20 GiB、単一 AZ、非公開、保管時暗号化 |
| シークレット | `memo-app/<env>/db`（username, password, host, port, dbname）と `memo-app/<env>/app` |
| コンピュート | ECR、ECS クラスタ、Fargate サービス、タスク定義、ALB、ターゲットグループ（`/api/health`） |
| ログと IAM | `/ecs/memo-app-<env>/backend`、実行ロール、ポリシーなしのタスクロール |
| フロント | パブリックアクセスを塞いだ S3、OAC 付き CloudFront、SPA 用に 403/404 を `index.html` へ |
| API の HTTPS | ALB をオリジンにする 2 つ目の CloudFront（キャッシュなし） |

モジュールは `modules/network`、`modules/security`、`modules/database`、`modules/backend`、`modules/frontend`、`modules/api_edge` です。

## 前提

- Terraform 1.5 以上（この定義は 1.16.4 で `fmt` / `validate` 済み）
- AWS CLI v2 と、対象アカウントへの認証（`AWS_PROFILE` など）。アクセスキーはファイルに書かない
- 初回のイメージ push には Docker
- フロントの同期には Node.js（`frontend/` がマージされたあと）
- 状態ファイルには DB パスワードが入ります。共有する前に、下のリモートステートを有効にしてください

ローカルの Compose は別物です。開発用パスワードや `docker-compose.yml` はこの Terraform から参照しません。

## リモートステート

デフォルトはローカルステートです。`versions.tf` の S3 バックエンドはコメントアウトしてあります。共有 apply の前に、状態用のバケットとロックテーブルを一度だけ作ります。ここにはアプリの秘密情報を置かず、バケット名もリポジトリにコミットしません。

`us-east-1` では `create-bucket` に `LocationConstraint` を付けません。以下は `ap-northeast-1` 向けです。

```bash
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGION=ap-northeast-1
BUCKET="memo-app-tfstate-${ACCOUNT_ID}"
TABLE="memo-app-terraform-locks"

aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws dynamodb create-table \
  --table-name "$TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"
```

`backend.hcl.example` を `backend.hcl` にコピーし、バケット名を埋めます。`backend.hcl` は gitignore 済みです。dev と prod で **state の key を分けてください**。同じ state に両方の tfvars を apply すると、もう一方の環境を消します。workspace は使いません。

```hcl
bucket         = "memo-app-tfstate-123456789012"
key            = "memo-app/dev/terraform.tfstate" # prod は memo-app/prod/terraform.tfstate
region         = "ap-northeast-1"
dynamodb_table = "memo-app-terraform-locks"
encrypt        = true
```

```bash
cd infra/terraform
terraform init -backend-config=backend.hcl
```

まだリモートステートを作らない検証なら、コメントを外さずに `terraform init` します。その場合の `terraform.tfstate` も gitignore 済みです。コミットしないでください。

## 変数

リージョン、プロジェクト名、サイズは変数です。環境差は `envs/dev.tfvars` と `envs/prod.tfvars` にあります。

| 変数 | 既定 | dev | prod |
| --- | --- | --- | --- |
| `aws_region` | ap-northeast-1 | 同じ | 同じ |
| `project_name` | memo-app | 同じ | 同じ |
| `environment` | dev | dev | prod |
| `fargate_in_public_subnets` | true | true | false |
| `enable_nat_gateway` | false | false | true |
| `rds_instance_class` | db.t4g.micro | 同じ | 同じ |
| `rds_allocated_storage` | 20 | 同じ | 同じ |
| `rds_multi_az` | false | false | false |
| `fargate_cpu` / `fargate_memory` | 256 / 512 | 同じ | 同じ |
| `desired_count` | 0 | 0 | 1 |
| `rds_deletion_protection` | false | false | true |
| `rds_skip_final_snapshot` | true | true | false |
| `rds_backup_retention_days` | 1 | 1 | 7 |
| `log_retention_days` | 7 | 7 | 30 |
| `secret_recovery_window_days` | 0 | 0 | 7 |

`backend_image` は必須です。コミット済みの tfvars は公開 nginx イメージを指しています。`desired_count` が 1 以上のとき、このプレースホルダのままだと plan が失敗します。ECR に push した URI を **tfvars に書き込んで** から apply してください。`-var` だけだと次の plan で tfvars の値に戻ります。

DB パスワードは変数にしません。`random_password` が生成し、RDS と Secrets Manager に渡します。特殊文字は入れていません。

## 適用

作業ディレクトリは `infra/terraform` です。

```bash
cd infra/terraform
terraform init
terraform fmt -recursive -check
terraform validate
terraform plan -var-file=envs/dev.tfvars
terraform apply -var-file=envs/dev.tfvars
```

dev の初回 apply は `desired_count = 0` です。ECR と ALB と RDS はできますが、タスクは起動しません。イメージを push したあと、`envs/dev.tfvars` の `backend_image` をその URI に書き換え、`desired_count` を 1 にして再度 apply します。

```bash
infra/terraform/scripts/push-backend.sh
# envs/dev.tfvars を編集してから
terraform apply -var-file=envs/dev.tfvars
```

prod は NAT と削除保護が有効です。state の key を prod 用にした作業コピーで、`envs/prod.tfvars` の `backend_image` を `memo-app-prod-backend` の URI に書き換えてから plan します。nginx のままでは plan が止まります。

アカウントにこの定義を apply するのは、認証情報を持った人が上の手順で行います。

## 出力をアプリがどう使うか

`terraform output` で一覧を出します。`rds_endpoint` と `rds_address` は sensitive なので、値を見るときは `terraform output -raw rds_endpoint` です。

### Backend

Go の `internal/config` は次の環境変数を読みます。タスク定義が同じ名前で注入するので、本番用のコード変更は不要です。

| 環境変数 | 出どころ |
| --- | --- |
| `HTTP_ADDR` | `:8080` |
| `DB_HOST` | RDS のアドレス（`rds_address`） |
| `DB_PORT` | `5432` |
| `DB_NAME` | `memo` |
| `DB_USER` / `DB_PASSWORD` | シークレット `db_secret_arn` の JSON |
| `DB_SSLMODE` | `require`（ローカル Compose の `disable` とは違う。RDS は `rds.force_ssl=1`） |
| `CORS_ORIGIN` | `cloudfront_url`（スキーム付き、末尾スラッシュなし） |
| `APP_SECRET` | `app_secret_arn`。今の API は無視する。将来の秘密の置き場 |

イメージは `ecr_repository_url` に push したものです。実行ロールはそのリポジトリしか pull できません。

ヘルスチェックは `GET /api/health` です。Postgres に ping できれば `200 {"status":"ok"}`、できなければ `503` です。ALB は 200 だけを正常とみなします。

マイグレーション（`backend/migrations`、golang-migrate）は RDS がプライベートなので、開発者の PC からは届きません。API プロセスの起動時に同じ `DB_*` で適用するのが本番の経路です。手元でシークレットの中身を確認する例:

```bash
aws secretsmanager get-secret-value \
  --secret-id "$(terraform output -raw db_secret_arn)" \
  --query SecretString \
  --output text
```

パスワードをローテーションするときは `random_password.master` を置き換えて apply します。タスク定義の `CONFIG_VERSION` が変わるので、ECS は新しいパスワードでタスクを起動し直します。RDS 管理の自動ローテーションは使っていません。動いているタスクが古いパスワードのまま残るのを避けるためです。

ログは `log_group_name`（`/ecs/memo-app-<env>/backend`）です。

### Frontend

Vite はビルド時に `VITE_API_BASE_URL` を埋め込みます。値は `api_endpoint`（API 用 CloudFront の `https://....cloudfront.net`、末尾スラッシュなし）です。`http://<alb_dns_name>` は curl 用であり、HTTPS のページからは呼ばないでください。

```bash
infra/terraform/scripts/sync-frontend.sh
```

スクリプトは `api_endpoint` を読んで `frontend/` をビルドし、`frontend_bucket_name` へ sync し、`cloudfront_distribution_id` を invalidate します。ハッシュ付きアセットは長期キャッシュ、`index.html` は `no-cache` です。CI で既にビルド済みなら `SKIP_BUILD=1` を付けます。

CI の骨子:

```yaml
# ビルド時
env:
  VITE_API_BASE_URL: ${{ secrets.MEMO_API_ENDPOINT }} # terraform output -raw api_endpoint
run: npm ci && npm run build
# その後
# aws s3 sync frontend/dist s3://$BUCKET --delete
# aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

バケットはパブリックにしません。CloudFront の OAC だけが `s3:GetObject` できます。存在しないパスは SPA 用に `index.html` を返します。この書き換えはフロントのディストリビューションだけで、API の 404 には掛かりません。

## Backend イメージ

ローカル用の `infra/docker/backend.Dockerfile`（air）は ECS に載ません。本番は `infra/docker/backend.prod.Dockerfile` です。非 root、`backend/cmd/server` の静的バイナリ、RDS の TLS 用に CA 証明書を含みます。push は `scripts/push-backend.sh` です。

push 先は apply が作る ECR です。リポジトリ名は `memo-app-<env>-backend` で、直近 10 イメージだけ残します。

## コストの目安

既定は小さくしてあります。Fargate は 0.25 vCPU / 512 MiB、RDS は `db.t4g.micro`、Multi-AZ なし、Container Insights なし、RDS の Performance Insights なしです。

固定費で大きいのは ALB と、prod だけ有効な NAT Gateway です。NAT は小さなインスタンスより高くなりがちなので、dev では作りません。dev のタスクはパブリックサブネットに出しますが、8080 は ALB のセキュリティグループからしか受けません。`desired_count = 0` にすると Fargate の起動分は止まります。ALB と RDS は残ります。使わない dev は「破棄」に従って消してください。

## 破棄

prod は `rds_deletion_protection` と `alb_deletion_protection` が true です。消す前に、その環境の tfvars で両方を false にして apply し、RDS の最終スナップショット名 `memo-app-prod-final` が残ることを確認してください。同じ名前のスナップショットが既にあると、次の destroy は失敗します。

```bash
terraform destroy -var-file=envs/dev.tfvars
```

prod のシークレットは削除後 7 日、名前が予約されます。すぐ作り直す場合は、コンソールから削除待ちのシークレットを消すか、回復期間が終わるのを待ちます。

## ディレクトリ

```
infra/terraform/
  envs/dev.tfvars
  envs/prod.tfvars
  backend.hcl.example
  modules/
  scripts/push-backend.sh
  scripts/sync-frontend.sh
infra/docker/backend.prod.Dockerfile
```
