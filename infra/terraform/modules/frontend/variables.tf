variable "name" {
  description = "Name prefix."
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket destroy while objects remain."
  type        = bool
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
}
