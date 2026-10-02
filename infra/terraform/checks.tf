resource "terraform_data" "guards" {
  lifecycle {
    precondition {
      condition     = var.fargate_in_public_subnets || var.enable_nat_gateway
      error_message = "Fargate tasks in private subnets need enable_nat_gateway = true so they can reach ECR, Secrets Manager, and CloudWatch Logs."
    }

    precondition {
      condition     = var.desired_count == 0 || !strcontains(var.backend_image, "public.ecr.aws/docker/library/nginx")
      error_message = "backend_image is still the public nginx placeholder. Write the ECR image URI into the tfvars file before raising desired_count above 0."
    }

    precondition {
      condition = (
        (var.fargate_cpu == 256 && contains([512, 1024, 2048], var.fargate_memory)) ||
        (var.fargate_cpu == 512 && contains([1024, 2048, 3072, 4096], var.fargate_memory)) ||
        (var.fargate_cpu == 1024 && contains([2048, 3072, 4096, 5120, 6144, 7168, 8192], var.fargate_memory)) ||
        (var.fargate_cpu == 2048 && var.fargate_memory >= 4096 && var.fargate_memory <= 16384 && var.fargate_memory % 1024 == 0) ||
        (var.fargate_cpu == 4096 && var.fargate_memory >= 8192 && var.fargate_memory <= 30720 && var.fargate_memory % 1024 == 0)
      )
      error_message = "fargate_cpu and fargate_memory are not a valid Fargate pair. The smallest pair is cpu 256 and memory 512."
    }
  }
}
