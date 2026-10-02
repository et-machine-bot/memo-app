output "aws_region" {
  description = "Region the stack was applied in."
  value       = var.aws_region
}

output "cloudfront_url" {
  description = "HTTPS origin of the React app. Backend CORS_ORIGIN is set to this value."
  value       = module.frontend.url
}

output "cloudfront_distribution_id" {
  description = "Frontend distribution id. Pass it to create-invalidation after an S3 sync."
  value       = module.frontend.distribution_id
}

output "cloudfront_distribution_arn" {
  description = "Frontend CloudFront distribution ARN."
  value       = module.frontend.distribution_arn
}

output "frontend_bucket_name" {
  description = "Private S3 bucket that stores the Vite build."
  value       = module.frontend.bucket_name
}

output "alb_dns_name" {
  description = "Public DNS name of the API load balancer."
  value       = module.backend.alb_dns_name
}

output "alb_url" {
  description = "HTTP URL of the load balancer. Useful for curl from a trusted network. Browsers on the HTTPS frontend must call api_endpoint instead."
  value       = "http://${module.backend.alb_dns_name}"
}

output "alb_arn" {
  description = "Application Load Balancer ARN."
  value       = module.backend.alb_arn
}

output "api_endpoint" {
  description = "HTTPS base URL of the Go API. Set VITE_API_BASE_URL to this when building the frontend. No trailing slash."
  value       = module.api_edge.url
}

output "api_cloudfront_distribution_id" {
  description = "API CloudFront distribution id."
  value       = module.api_edge.distribution_id
}

output "api_cloudfront_distribution_arn" {
  description = "API CloudFront distribution ARN."
  value       = module.api_edge.distribution_arn
}

output "rds_endpoint" {
  description = "PostgreSQL host:port. The master password is only in Secrets Manager."
  value       = module.database.endpoint
  sensitive   = true
}

output "rds_address" {
  description = "PostgreSQL hostname. Injected into tasks as DB_HOST."
  value       = module.database.address
  sensitive   = true
}

output "rds_arn" {
  description = "RDS instance ARN."
  value       = module.database.arn
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for the JSON document with username, password, host, port, and dbname."
  value       = module.database.secret_arn
}

output "app_secret_arn" {
  description = "Secrets Manager ARN injected into tasks as APP_SECRET. The current Go API ignores this variable."
  value       = module.backend.app_secret_arn
}

output "ecr_repository_url" {
  description = "Push the production Go image here. Append a tag before setting backend_image."
  value       = module.backend.ecr_repository_url
}

output "ecr_repository_arn" {
  description = "ECR repository ARN. The execution role may pull only this repository."
  value       = module.backend.ecr_repository_arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = module.backend.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN."
  value       = module.backend.cluster_arn
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = module.backend.service_name
}

output "ecs_task_role_arn" {
  description = "Task role ARN. It has no policies until the API calls AWS APIs."
  value       = module.backend.task_role_arn
}

output "ecs_execution_role_arn" {
  description = "Task execution role ARN. It can pull this ECR repository, write this log group, and read the two secrets."
  value       = module.backend.execution_role_arn
}

output "log_group_name" {
  description = "CloudWatch log group for API task stdout."
  value       = module.backend.log_group_name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN."
  value       = module.backend.log_group_arn
}

output "vpc_id" {
  description = "VPC id."
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet ids. RDS uses these. Prod Fargate uses them too."
  value       = module.network.private_subnet_ids
}

output "ecs_security_group_id" {
  description = "Security group attached to API tasks. One-off migration tasks in the VPC should use this group so RDS accepts them."
  value       = module.security.ecs_security_group_id
}
