variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "Subnets for the public load balancer."
  type        = list(string)
}

variable "task_subnet_ids" {
  description = "Subnets for Fargate tasks. Public in dev, private in prod."
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Must be true when task_subnet_ids are public subnets and there is no NAT gateway."
  type        = bool
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_security_group_id" {
  type = string
}

variable "image" {
  description = "Image URI including the tag."
  type        = string
}

variable "cpu" {
  type = number
}

variable "memory" {
  type = number
}

variable "desired_count" {
  type = number
}

variable "container_port" {
  type = number
}

variable "log_retention_days" {
  type = number
}

variable "ecr_force_delete" {
  type = bool
}

variable "alb_deletion_protection" {
  type = bool
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type = number
}

variable "db_name" {
  type = string
}

variable "db_secret_arn" {
  type = string
}

variable "db_secret_version_id" {
  type = string
}

variable "cors_origin" {
  description = "Exact browser origin allowed to call the API. This is the frontend CloudFront URL."
  type        = string
}

variable "secret_recovery_window_days" {
  type = number
}
