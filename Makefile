# PMCS Makefile

.PHONY: dev prod down logs seed test

## Start development stack
dev:
    docker compose up --build -d

## Start production stack
prod:
    docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d

## Stop all containers
down:
    docker compose down

## Stop production containers
down-prod:
    docker compose -f docker-compose.prod.yml down

## View logs
logs:
    docker compose logs -f

## Run seed script
seed:
    cd api-gateway && npx ts-node src/seed.ts

## TypeScript compile check
check:
    cd api-gateway && npx tsc --noEmit

## Go build check
build-go:
    cd ast-engine && go build ./...

## Full health check
health:
    curl -s http://localhost:3010/health | python3 -m json.tool
    curl -s http://localhost:50052/health | python3 -m json.tool
