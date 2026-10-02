variable "name" {
  description = "Name prefix."
  type        = string
}

variable "vpc_id" {
  description = "VPC that owns the security groups."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR. DNS egress is limited to this range."
  type        = string
}

variable "backend_port" {
  description = "TCP port the API container listens on."
  type        = number
}
