module "network" {
  source = "./modules/network"

  name               = local.name
  cidr               = var.vpc_cidr
  az_count           = var.az_count
  enable_nat_gateway = var.enable_nat_gateway
}

module "security" {
  source = "./modules/security"

  name         = local.name
  vpc_id       = module.network.vpc_id
  vpc_cidr     = module.network.vpc_cidr
  backend_port = var.backend_port
}

module "frontend" {
  source = "./modules/frontend"

  name          = local.name
  force_destroy = var.frontend_force_destroy
  price_class   = var.cloudfront_price_class
}

module "database" {
  source = "./modules/database"

  name                        = local.name
  subnet_ids                  = module.network.private_subnet_ids
  security_group_id           = module.security.rds_security_group_id
  instance_class              = var.rds_instance_class
  allocated_storage           = var.rds_allocated_storage
  engine_version              = var.rds_engine_version
  db_name                     = var.db_name
  username                    = var.db_username
  multi_az                    = var.rds_multi_az
  backup_retention_days       = var.rds_backup_retention_days
  deletion_protection         = var.rds_deletion_protection
  skip_final_snapshot         = var.rds_skip_final_snapshot
  apply_immediately           = var.rds_apply_immediately
  secret_recovery_window_days = var.secret_recovery_window_days
}

module "backend" {
  source = "./modules/backend"

  name                        = local.name
  region                      = var.aws_region
  vpc_id                      = module.network.vpc_id
  public_subnet_ids           = module.network.public_subnet_ids
  task_subnet_ids             = var.fargate_in_public_subnets ? module.network.public_subnet_ids : module.network.private_subnet_ids
  assign_public_ip            = var.fargate_in_public_subnets
  alb_security_group_id       = module.security.alb_security_group_id
  ecs_security_group_id       = module.security.ecs_security_group_id
  image                       = var.backend_image
  cpu                         = var.fargate_cpu
  memory                      = var.fargate_memory
  desired_count               = var.desired_count
  container_port              = var.backend_port
  log_retention_days          = var.log_retention_days
  ecr_force_delete            = var.ecr_force_delete
  alb_deletion_protection     = var.alb_deletion_protection
  db_host                     = module.database.address
  db_port                     = module.database.port
  db_name                     = var.db_name
  db_secret_arn               = module.database.secret_arn
  db_secret_version_id        = module.database.secret_version_id
  cors_origin                 = module.frontend.url
  secret_recovery_window_days = var.secret_recovery_window_days
}

module "api_edge" {
  source = "./modules/api_edge"

  name         = local.name
  alb_dns_name = module.backend.alb_dns_name
  price_class  = var.cloudfront_price_class
}
