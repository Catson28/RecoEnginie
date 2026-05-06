# ============================================================
# ReconEngine — Makefile
# ============================================================

.PHONY: help setup dev up down logs test seed clean

help:
	@echo ""
	@echo "  ReconEngine — Available Commands"
	@echo ""
	@echo "  make setup      Install all dependencies"
	@echo "  make dev        Start development (MySQL via Docker, servers local)"
	@echo "  make up         Start all services via Docker Compose"
	@echo "  make down       Stop all Docker services"
	@echo "  make logs       Tail Docker logs"
	@echo "  make test       Run all tests"
	@echo "  make seed       Load sample data into the database"
	@echo "  make clean      Remove all containers and volumes"
	@echo ""

setup:
	cp -n .env.example .env || true
	cd backend  && pip install -r requirements.txt
	cd frontend && npm install

dev:
	bash infra/scripts/start_dev.sh

up:
	docker-compose up -d --build
	@echo "✅ All services started."
	@echo "   App:      http://localhost:80"
	@echo "   API:      http://localhost:8000/docs"

down:
	docker-compose down

logs:
	docker-compose logs -f

test:
	cd backend && pytest tests/ -v --cov=app
	cd frontend && npm run type-check

seed:
	bash infra/scripts/seed_db.sh

migrate:
	bash infra/scripts/run_migrations.sh

clean:
	docker-compose down -v --remove-orphans
	@echo "✅ All containers and volumes removed."
