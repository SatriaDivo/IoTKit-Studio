# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build dynamic-linked or static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main ./cmd/api/main.go

# Final stage
FROM alpine:3.18

WORKDIR /app

# Install CA certificates for secure external API calls and timezones
RUN apk add --no-cache ca-certificates tzdata

# Copy binary
COPY --from=builder /app/main .

# Expose port
EXPOSE 4000

# Command to execute
CMD ["./main"]
