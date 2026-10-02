variable "aws_region" {
  description = "AWS region for all regional resources. CloudFront is global and uses the default certificate."
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Short lowercase prefix used in resource names."
  type        = string
  default     = "memo-app"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,15}$", var.project_name))
    error_message = "project_name must be 1-16 characters, start with a letter, and contain only lowercase letters, digits, and hyphens."
  }
}

variable "environment" {
  description = "Environment name, such as dev or prod. Used in names and tags."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,7}$", var.environment))
    error_message = "environment must be 1-8 characters, start with a letter, and contain only lowercase letters, digits, and hyphens."
  }
}

variable "vpc_cidr" {
  description = "IPv4 CIDR for the VPC. Public subnets use the first /24s and private subnets use 10.x.10.0/24 and up."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones. The load balancer needs at least two."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3."
  }
}

variable "enable_nat_gateway" {
  description = "Create one NAT gateway for private-subnet egress. Required when fargate_in_public_subnets is false. This is the largest fixed cost after the load balancer."
  type        = bool
  default     = false
}

variable "fargate_in_public_subnets" {
  description = "Run API tasks in public subnets with public IPs so they can reach ECR without a NAT gateway. The task security group still allows port 8080 only from the load balancer. Production tfvars turn this off."
  type        = bool
  default     = true
}

variable "rds_instance_class" {
  description = "RDS instance class. db.t4g.micro is the modest default."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS storage in GiB. gp3 requires at least 20."
  type        = number
  default     = 20

  validation {
    condition     = var.rds_allocated_storage >= 20 && var.rds_allocated_storage <= 100
    error_message = "rds_allocated_storage must be between 20 and 100 for this stack."
  }
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version. A major-only value such as 16 lets AWS choose the current minor. The instance ignores later drift of this attribute so automatic minor upgrades do not fight Terraform."
  type        = string
  default     = "16"
}

variable "rds_multi_az" {
  description = "Run a synchronous standby in another AZ. Leave false to keep the default bill small."
  type        = bool
  default     = false
}

variable "rds_backup_retention_days" {
  description = "Automated backup retention. Zero disables backups."
  type        = number
  default     = 1

  validation {
    condition     = var.rds_backup_retention_days >= 0 && var.rds_backup_retention_days <= 35
    error_message = "rds_backup_retention_days must be between 0 and 35."
  }
}

variable "rds_deletion_protection" {
  description = "Block destroy of the RDS instance until this is set back to false."
  type        = bool
  default     = false
}

variable "rds_skip_final_snapshot" {
  description = "Skip the final snapshot on destroy. Production tfvars set this to false."
  type        = bool
  default     = true
}

variable "rds_apply_immediately" {
  description = "Apply RDS changes immediately instead of in the next maintenance window."
  type        = bool
  default     = true
}

variable "db_name" {
  description = "Initial database name. Matches the local Compose default."
  type        = string
  default     = "memo"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{0,62}$", var.db_name))
    error_message = "db_name must start with a letter and contain only lowercase letters, digits, and underscores."
  }
}

variable "db_username" {
  description = "Master username stored in Secrets Manager. Matches the local Compose default."
  type        = string
  default     = "memo"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{0,62}$", var.db_username))
    error_message = "db_username must start with a letter and contain only lowercase letters, digits, and underscores."
  }
}

variable "backend_image" {
  description = "Go API image, including the tag. dev.tfvars starts from a public placeholder while desired_count is 0. Persist the ECR URI in the tfvars file before raising the count. A one-off -var is not remembered on the next plan."
  type        = string

  validation {
    condition     = can(regex("^[^[:space:]]+/[^[:space:]]+:[^[:space:]]+$", var.backend_image))
    error_message = "backend_image must be a registry/repository:tag reference with no spaces."
  }
}

variable "backend_port" {
  description = "Container port. The Go server reads HTTP_ADDR and the load balancer health check uses /api/health on this port."
  type        = number
  default     = 8080
}

variable "fargate_cpu" {
  description = "Fargate CPU units. 256 is the smallest size."
  type        = number
  default     = 256
}

variable "fargate_memory" {
  description = "Fargate memory in MiB. 512 is the minimum for 256 CPU units."
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of API tasks. Keep 0 until the real image is in ECR, then set 1."
  type        = number
  default     = 0

  validation {
    condition     = var.desired_count >= 0 && var.desired_count <= 4
    error_message = "desired_count must be between 0 and 4."
  }
}

variable "log_retention_days" {
  description = "Retention for the ECS CloudWatch log group."
  type        = number
  default     = 7

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "log_retention_days must be a value CloudWatch Logs accepts."
  }
}

variable "frontend_force_destroy" {
  description = "Delete frontend objects, including old versions, when the bucket is destroyed."
  type        = bool
  default     = true
}

variable "ecr_force_delete" {
  description = "Delete container images when the ECR repository is destroyed."
  type        = bool
  default     = true
}

variable "alb_deletion_protection" {
  description = "Block destroy of the load balancer until this is set back to false."
  type        = bool
  default     = false
}

variable "secret_recovery_window_days" {
  description = "Days Secrets Manager keeps a deleted secret. Zero removes it immediately. Production should use 7 or more."
  type        = number
  default     = 0

  validation {
    condition     = var.secret_recovery_window_days == 0 || (var.secret_recovery_window_days >= 7 && var.secret_recovery_window_days <= 30)
    error_message = "secret_recovery_window_days must be 0 or between 7 and 30."
  }
}

variable "cloudfront_price_class" {
  description = "CloudFront price class. PriceClass_200 includes Japan and avoids the full edge set."
  type        = string
  default     = "PriceClass_200"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "cloudfront_price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}
