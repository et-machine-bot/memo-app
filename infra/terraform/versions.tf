terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state is recommended before any shared apply. Create the bucket and
  # lock table (see README), copy backend.hcl.example to backend.hcl, then:
  #   terraform init -backend-config=backend.hcl
  #
  # Use a different key per environment (dev and prod must not share a state).
  #
  # backend "s3" {}
}
