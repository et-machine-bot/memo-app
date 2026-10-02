#!/usr/bin/env bash
# Build the Vite app and publish dist/ to the private frontend bucket, then
# invalidate CloudFront. VITE_API_BASE_URL defaults to terraform output api_endpoint.
#
#   infra/terraform/scripts/sync-frontend.sh
#   SKIP_BUILD=1 infra/terraform/scripts/sync-frontend.sh
#   VITE_API_BASE_URL=https://example.cloudfront.net infra/terraform/scripts/sync-frontend.sh

set -euo pipefail

TF_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$TF_DIR/../.." && pwd)"
DIST="$ROOT/frontend/dist"

if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
  VITE_API_BASE_URL="$(terraform -chdir="$TF_DIR" output -raw api_endpoint)"
fi
VITE_API_BASE_URL="${VITE_API_BASE_URL%/}"

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  if [[ ! -f "$ROOT/frontend/package.json" ]]; then
    echo "frontend/package.json がありません。UI のソースが入ってから実行してください。" >&2
    exit 1
  fi
  (cd "$ROOT/frontend" && npm ci && VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build)
fi

if [[ ! -f "$DIST/index.html" ]]; then
  echo "$DIST/index.html がありません。先に frontend をビルドしてください。" >&2
  exit 1
fi

BUCKET="$(terraform -chdir="$TF_DIR" output -raw frontend_bucket_name)"
DIST_ID="$(terraform -chdir="$TF_DIR" output -raw cloudfront_distribution_id)"
REGION="${AWS_REGION:-$(terraform -chdir="$TF_DIR" output -raw aws_region)}"

aws s3 sync "$DIST" "s3://$BUCKET" \
  --region "$REGION" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 cp "$DIST/index.html" "s3://$BUCKET/index.html" \
  --region "$REGION" \
  --cache-control "no-cache" \
  --content-type "text/html; charset=utf-8"

aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" >/dev/null

echo "Synced s3://${BUCKET} with VITE_API_BASE_URL=${VITE_API_BASE_URL}"
echo "Invalidated CloudFront distribution ${DIST_ID}"
