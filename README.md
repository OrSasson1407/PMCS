# PMCS — Predictive Merge Conflict Solver

A real-time system that predicts and resolves Git merge conflicts before they occur.

## Architecture

| Service | Tech | Port |
|---|---|---|
| api-gateway | Node.js / TypeScript / Express | 3010 |
| ast-engine | Go / tree-sitter | 50052 |
| web-dashboard | React / Vite / TanStack Query | 8080 |
| postgres | PostgreSQL 15 | 5436 |
| redis | Redis 7 | 6386 |

## Quick Start

```bash
docker compose up --build
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | Public | Health check |
| POST | /webhooks/github/push | JWT | Ingest GitHub push events |
| GET | /repos/:id/risk/branches | JWT | Branch collision risk scores |
| POST | /ast/analyze/ondemand | JWT | On-demand AST comparison |

## Status

v0.1.0 — All five services running, PostgreSQL schema initialized, Redis caching wired, Go AST parser and conflict analyzer operational.
