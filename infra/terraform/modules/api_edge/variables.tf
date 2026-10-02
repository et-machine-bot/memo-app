variable "name" {
  description = "Name prefix."
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the public Application Load Balancer."
  type        = string
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
}
