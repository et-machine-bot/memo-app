output "address" {
  value = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "endpoint" {
  value = aws_db_instance.this.endpoint
}

output "arn" {
  value = aws_db_instance.this.arn
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "secret_version_id" {
  description = "Changes when the credential document changes, so the ECS task definition rolls."
  value       = aws_secretsmanager_secret_version.db.version_id
}
