FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN go build -o stakeholders-service .

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/stakeholders-service .

EXPOSE 8080
EXPOSE 9090

CMD ["./stakeholders-service"]
