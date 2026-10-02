aws_region   = "ap-northeast-1"
project_name = "memo-app"
environment  = "prod"

# タスクはプライベートサブネット。外向きは NAT Gateway が 1 つ。
enable_nat_gateway        = true
fargate_in_public_subnets = false

vpc_cidr = "10.0.0.0/16"
az_count = 2

rds_instance_class        = "db.t4g.micro"
rds_allocated_storage     = 20
rds_engine_version        = "16"
rds_multi_az              = false
rds_backup_retention_days = 7
rds_deletion_protection   = true
rds_skip_final_snapshot   = false
rds_apply_immediately     = false
db_name                   = "memo"
db_username               = "memo"

fargate_cpu    = 256
fargate_memory = 512
desired_count  = 1
backend_port   = 8080

# plan は、この行を実在する ECR イメージに置き換えるまで失敗する。
# nginx のまま desired_count が 1 だとプレースホルダ禁止のチェックに掛かる。
backend_image = "public.ecr.aws/docker/library/nginx:1.27-alpine"

log_retention_days          = 30
frontend_force_destroy      = false
ecr_force_delete            = false
alb_deletion_protection     = true
secret_recovery_window_days = 7
cloudfront_price_class      = "PriceClass_200"
