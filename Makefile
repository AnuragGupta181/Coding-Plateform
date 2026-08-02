.PHONY: help judge0-dev-up judge0-dev-down judge0-prod-up judge0-prod-down app-up app-down dev-up dev-down prod-up prod-down clean-all logs

help:
	@echo "==========================================================="
	@echo "             NextGen Platform Docker Manager               "
	@echo "==========================================================="
	@echo "Available commands:"
	@echo ""
	@echo "  make dev-up           - Start the entire project in DEVELOPMENT mode (App + Judge0 Dev)"
	@echo "  make dev-down         - Stop the DEVELOPMENT environment"
	@echo "  make prod-up          - Start the entire project in PRODUCTION mode (App + Judge0 Prod)"
	@echo "  make prod-down        - Stop the PRODUCTION environment"
	@echo ""
	@echo "  make judge0-dev-up    - Start only the Judge0 Development environment"
	@echo "  make judge0-dev-down  - Stop the Judge0 Development environment"
	@echo "  make judge0-prod-up   - Start only the Judge0 Production environment"
	@echo "  make judge0-prod-down - Stop the Judge0 Production environment"
	@echo "  make app-up           - Start the Main App (Backend + Frontend) via Docker"
	@echo "  make app-down         - Stop the Main App"
	@echo ""
	@echo "  make logs             - Tail logs for all running compose environments"
	@echo "  make clean-all        - Stop ALL environments AND delete volumes (Destructive!)"
	@echo "==========================================================="

# ==========================================
# Full Environment Management
# ==========================================
dev-up: judge0-dev-up app-up

dev-down: app-down judge0-dev-down

prod-up: judge0-prod-up app-up

prod-down: app-down judge0-prod-down


# ==========================================
# Main Application
# ==========================================
app-up:
	docker compose up -d

app-down:
	docker compose down


# ==========================================
# Judge0 Development Environment
# ==========================================
judge0-dev-up:
	docker compose -f docker-compose.dev.yml up -d

judge0-dev-down:
	docker compose -f docker-compose.dev.yml down


# ==========================================
# Judge0 Production Environment
# ==========================================
judge0-prod-up:
	docker compose -f docker-compose-judge0-prod.yml up -d

judge0-prod-down:
	docker compose -f docker-compose-judge0-prod.yml down


# ==========================================
# Maintenance
# ==========================================
logs:
	# Note: This simply tails the main docker-compose logs, 
	# but you can specify specific files if you need prod logs.
	docker compose logs -f

clean-all:
	@echo "WARNING: This will destroy all running containers and wipe the databases!"
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose-judge0-prod.yml down -v
	@echo "Clean complete."
