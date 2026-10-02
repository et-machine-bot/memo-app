terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.70.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }
}

locals {
  engine_family = "postgres${split(".", var.engine_version)[0]}"
}

# Alphanumeric only. RDS rejects some punctuation, and the Go DSN quoter is
# easier to reason about when the password has no quotes or spaces.
resource "random_password" "master" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "this" {
  name        = var.name
  description = "Private subnets for ${var.name} PostgreSQL"
  subnet_ids  = var.subnet_ids

  tags = {
    Name = var.name
  }
}

resource "aws_db_parameter_group" "this" {
  name        = var.name
  family      = local.engine_family
  description = "Force TLS for ${var.name}"

  parameter {
    name         = "rds.force_ssl"
    value        = "1"
    apply_method = "pending-reboot"
  }

  tags = {
    Name = var.name
  }
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.username
  password = random_password.master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  parameter_group_name   = aws_db_parameter_group.this.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false
  multi_az               = var.multi_az
  network_type           = "IPV4"

  backup_retention_period   = var.backup_retention_days
  copy_tags_to_snapshot     = true
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name}-final"
  apply_immediately         = var.apply_immediately

  auto_minor_version_upgrade   = true
  performance_insights_enabled = false
  monitoring_interval          = 0

  tags = {
    Name = var.name
  }

  # AWS stores the resolved minor (for example 16.8) after an apply that
  # requested major version 16. Ignoring the attribute keeps auto minor
  # upgrades from showing up as a perpetual diff.
  lifecycle {
    ignore_changes = [engine_version]
  }
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name}/db"
  description             = "PostgreSQL master credentials for ${var.name}"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = {
    Name = "${var.name}/db"
  }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.username
    password = random_password.master.result
    engine   = "postgres"
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    dbname   = var.db_name
  })
}
