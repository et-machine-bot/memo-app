aws_region   = "ap-northeast-1"
project_name = "memo-app"
environment  = "dev"

# パブリックサブネットの Fargate は NAT Gateway を作らない。
# タスクの 8080 は ALB からのみ。RDS はプライベートのまま。
enable_nat_gateway        = false
fargate_in_public_subnets = true

vpc_cidr = "10.0.0.0/16"
az_count = 2

rds_instance_class        = "db.t4g.micro"
rds_allocated_storage     = 20
rds_engine_version        = "16"
rds_multi_az              = false
rds_backup_retention_days = 1
rds_deletion_protection   = false
rds_skip_final_snapshot   = true
rds_apply_immediately     = true
db_name                   = "memo"
db_username               = "memo"

fargate_cpu    = 256
fargate_memory = 512
# プレースホルダは pull されない（desired_count = 0）。
# push 後に ECR の URI へ書き換え、desired_count を 1 にする。
# -var だけだと次の plan でこの値に戻る。
backend_image = "public.ecr.aws/docker/library/nginx:1.27-alpine"
desired_count = 0
backend_port  = 8080

log_retention_days          = 7
frontend_force_destroy      = true
ecr_force_delete            = true
alb_deletion_protection     = false
secret_recovery_window_days = 0
cloudfront_price_class      = "PriceClass_200"
