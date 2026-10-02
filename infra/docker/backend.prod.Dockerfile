# Production image for the Go API on ECS Fargate.
# Local Compose uses infra/docker/backend.Dockerfile (air, hot reload). Do not push that image.
#
# From the repository root, after backend/ exists:
#   docker build -f infra/docker/backend.prod.Dockerfile -t memo-backend .
#
# infra/terraform/scripts/push-backend.sh wraps the build, ECR login, and push.

FROM golang:1.25-alpine AS build

WORKDIR /src

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.20

RUN apk add --no-cache ca-certificates \
    && adduser -D -H -u 65532 app

COPY --from=build /out/server /server

USER app
EXPOSE 8080
ENTRYPOINT ["/server"]
