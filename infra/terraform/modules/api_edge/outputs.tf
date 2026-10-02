output "distribution_id" {
  value = aws_cloudfront_distribution.api.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.api.arn
}

output "domain_name" {
  value = aws_cloudfront_distribution.api.domain_name
}

output "url" {
  value = "https://${aws_cloudfront_distribution.api.domain_name}"
}
