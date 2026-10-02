variable "name" {
  description = "Name prefix used for the instance identifier and secret name."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet ids for the DB subnet group."
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group that allows PostgreSQL only from API tasks."
  type        = string
}

variable "instance_class" {
  type = string
}

variable "allocated_storage" {
  type = number
}

variable "engine_version" {
  type = string
}

variable "db_name" {
  type = string
}

variable "username" {
  type = string
}

variable "multi_az" {
  type = bool
}

variable "backup_retention_days" {
  type = number
}

variable "deletion_protection" {
  type = bool
}

variable "skip_final_snapshot" {
  type = bool
}

variable "apply_immediately" {
  type = bool
}

variable "secret_recovery_window_days" {
  type = number
}
