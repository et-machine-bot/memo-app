FROM golang:1.22-alpine

RUN apk add --no-cache ca-certificates curl git \
    && go install github.com/air-verse/air@v1.61.7

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN go build -o /tmp/memo-server ./cmd/server

EXPOSE 8080

# Bind-mounted source is rebuilt by air (polling enabled in .air.toml).
CMD ["air", "-c", ".air.toml"]
