#!/usr/bin/env bash
# Build the production Go image and push it to the ECR repository from terraform output.
# Run after the first apply (desired_count can stay 0).
#
#   infra/terraform/scripts/push-backend.sh
#   IMAGE_TAG=abc1234 infra/terraform/scripts/push-backend.sh
#
# Then apply again with backend_image set to the printed URI and desired_count = 1.

set -euo pipefail

TF_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$TF_DIR/../.." && pwd)"

if [[ ! -f "$ROOT/backend/go.mod" ]]; then
  echo "backend/go.mod がありません。API のソースが入ってから実行してください。" >&2
  exit 1
fi

if [[ -n "${IMAGE_TAG:-}" ]]; then
  TAG="$IMAGE_TAG"
elif git -C "$ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
  TAG="$(git -C "$ROOT" rev-parse --short HEAD)"
else
  TAG="latest"
fi

REPO="$(terraform -chdir="$TF_DIR" output -raw ecr_repository_url)"
REGISTRY="${REPO%%/*}"
# 123456789012.dkr.ecr.ap-northeast-1.amazonaws.com → ap-northeast-1
REGION="$(echo "$REGISTRY" | cut -d. -f4)"

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker build -f "$ROOT/infra/docker/backend.prod.Dockerfile" -t "$REPO:$TAG" "$ROOT"
docker push "$REPO:$TAG"

echo
echo "Pushed ${REPO}:${TAG}"
echo "envs/<env>.tfvars の backend_image を次の値にし、desired_count を 1 にしてから apply してください。"
echo "  backend_image = \"${REPO}:${TAG}\""
echo "-var だけで渡すと、次の plan で tfvars の値に戻ります。"
