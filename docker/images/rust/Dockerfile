FROM rust:1.80-alpine
RUN apk add --no-cache musl-dev
ENV PATH="/usr/local/cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
RUN adduser -D -u 10001 runner
USER runner
WORKDIR /workspace
