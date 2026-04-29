FROM rust:1.80-alpine
RUN apk add --no-cache musl-dev
RUN adduser -D -u 10001 runner
USER runner
WORKDIR /workspace
