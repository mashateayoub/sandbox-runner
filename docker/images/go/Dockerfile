FROM golang:1.23-alpine
ENV PATH="/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV GOPATH="/tmp/go"
RUN adduser -D -u 10001 runner
USER runner
WORKDIR /workspace
