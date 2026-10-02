variable "name" {
  description = "Name prefix, typically project-environment."
  type        = string
}

variable "cidr" {
  description = "VPC CIDR."
  type        = string
}

variable "az_count" {
  description = "How many AZs to spread subnets across."
  type        = number
}

variable "enable_nat_gateway" {
  description = "When true, one NAT gateway in the first public subnet is the default route for every private subnet."
  type        = bool
}
