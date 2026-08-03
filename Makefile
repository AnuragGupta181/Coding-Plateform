.PHONY: help judge0-dev-up judge0-dev-down judge0-prod-up judge0-prod-down app-up app-down dev-up dev-down prod-up prod-down clean-all logs loadtest-auth loadtest-fetch loadtest-submit loadtest-realtime loadtest-judge0 loadtest-full loadtest-500realtime loadtest-500batch

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
	@echo "Load Testing Suites:"
	@echo "  make loadtest-auth         - Run candidate auth scenario"
	@echo "  make loadtest-fetch        - Run test fetching scenario"
	@echo "  make loadtest-submit       - Run answer submission scenario"
	@echo "  make loadtest-realtime     - Run realtime dashboard sync load scenario"
	@echo "  make loadtest-judge0       - Run Judge0 code execution scenario"
	@echo "  make loadtest-full         - Run full exam simulation workflow"
	@echo "  make loadtest-500realtime  - Run 500 concurrent candidates active exam workflow"
	@echo "  make loadtest-500batch     - Run 500 candidates batch simulation workflow"
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
	docker compose -f docker-compose.judge0.dev.yml up -d

judge0-dev-down:
	docker compose -f docker-compose.judge0.dev.yml down


# ==========================================
# Judge0 Production Environment
# ==========================================
judge0-prod-up:
	docker compose -f docker-compose.judge0.prod.yml up -d

judge0-prod-down:
	docker compose -f docker-compose.judge0.prod.yml down


# ==========================================
# Load Testing Management
# ==========================================
loadtest-auth:
	pnpm --prefix load_testing test:auth

loadtest-fetch:
	pnpm --prefix load_testing test:fetch

loadtest-submit:
	pnpm --prefix load_testing test:submit

loadtest-realtime:
	pnpm --prefix load_testing test:realtime

loadtest-judge0:
	pnpm --prefix load_testing test:judge0

loadtest-full:
	pnpm --prefix load_testing test:full

loadtest-500realtime:
	pnpm --prefix load_testing test:500realtime

loadtest-500batch:
	pnpm --prefix load_testing test:500batch


# ==========================================
# Maintenance
# ==========================================
logs:
	docker compose logs -f

clean-all:
	@echo "WARNING: This will destroy all running containers and wipe the databases!"
	docker compose down -v
	docker compose -f docker-compose.judge0.dev.yml down -v
	docker compose -f docker-compose.judge0.prod.yml down -v
	@echo "Clean complete."
