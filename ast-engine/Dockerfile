FROM golang:1.24-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 go build -o bin/server ./cmd/server

FROM alpine:3.19

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY --from=builder /app/bin/server ./server

EXPOSE 50051

CMD ["./server"]
