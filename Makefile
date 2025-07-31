# Variables
DOCKER ?= podman
COMPOSE := $(DOCKER)-compose -f ./compose.yaml
PROJECT_DIR := orw-deno
IMAGE_NAME := orw
VOLUME_NAME := orw_data
SEED_IMAGE := orw_seed
SEED_DB_FILE := orw.new.20250731.db

## Application configuration

# Note that this port is external from the view of the container
# It may still be an internal port for the TLS proxy
EXTERNAL_PORT ?= 19913

# The real public URL people can see, for e.g. RSS feed links
ORW_PUBLIC_URL ?= https://dev-orw.karleo.net:9180
ORW_REPOSITORY_URL ?= https://github.com/fry69/orw
NODE_ENV ?= production

# Semi-random value for DENO_DEPLOYMENT_ID, to enable proper client caching
# see -> https://fresh.deno.dev/docs/concepts/deployment#-docker
GIT_REVISION=$$(git rev-parse HEAD)

# Export variables for docker-compose
export IMAGE_NAME
export VOLUME_NAME
export SEED_IMAGE
export SEED_DB_FILE
export PROJECT_DIR
export EXTERNAL_PORT
export GIT_REVISION
export ORW_PUBLIC_URL
export ORW_REPOSITORY_URL
export NODE_ENV

# Default target
all: help

# Show available targets
help:
	@echo "Available targets:"
	@echo "  config     - Show current configuration"
	@echo "  build      - Build all images"
	@echo "  up         - Start services"
	@echo "  smart-up   - Start services (seed if needed)"
	@echo "  rebuild    - Start services with rebuild"
	@echo "  down       - Stop services"
	@echo "  status     - Show service status and recent logs"
	@echo "  logs       - Follow service logs"
	@echo "  seed       - Seed database with initial data"
	@echo "  reset      - Reset volume (destructive)"
	@echo "  clean      - Remove containers and prune images"
	@echo "  nuke       - Reset everything for clean rebuild"
	@echo "  versions   - Check dependency versions"

# Show current configuration
config:
	@echo "Current configuration:"
	@echo "  DOCKER:             $(DOCKER)"
	@echo "  PROJECT_DIR:        $(PROJECT_DIR)"
	@echo "  IMAGE_NAME:         $(IMAGE_NAME)"
	@echo "  VOLUME_NAME:        $(VOLUME_NAME)"
	@echo "  SEED_IMAGE:         $(SEED_DB_FILE)"
	@echo "  EXTERNAL_PORT:      $(EXTERNAL_PORT)"
	@echo "  ORW_PUBLIC_URL:     $(ORW_PUBLIC_URL)"
	@echo "  ORW_REPOSITORY_URL: $(ORW_REPOSITORY_URL)"
	@echo "  NODE_ENV:           $(NODE_ENV)"

# Build all images
build:
	$(COMPOSE) build
	$(COMPOSE) --profile seed build

# Start services
up:
	$(COMPOSE) up --detach

# Smart startup: seed if needed, then start services
smart-up:
	@echo "Checking if database seeding is needed..."
	@if ! $(DOCKER) run --rm -v $(VOLUME_NAME):/data alpine test -f /data/orw.db 2>/dev/null; then \
		echo "Database not found, seeding..."; \
		$(MAKE) seed; \
		echo "Seeding complete."; \
	else \
		echo "Database exists, skipping seed."; \
	fi
	@echo "Starting services..."
	$(COMPOSE) up --detach

# Start services with rebuild
rebuild: down
	$(COMPOSE) up --build --detach

# Stop services
down:
	$(COMPOSE) down

# Show service status and recent logs
status:
	@echo "=== Service Status ==="
	$(COMPOSE) ps
	@echo ""
	@echo "=== Recent Logs ==="
	$(COMPOSE) logs --tail=20

# Follow service logs
logs:
	$(COMPOSE) logs --follow

# Remove containers and prune images
clean:
	$(DOCKER) rm --all --force 2>/dev/null || true
	$(DOCKER) image prune --force

# Remove generated files (should not be necessary with .dockerignore)
prune:
	rm -rf $(PROJECT_DIR)/node_modules $(PROJECT_DIR)/_fresh $(PROJECT_DIR)/data

# Reset volume (destructive)
reset: down
	$(DOCKER) volume rm $(VOLUME_NAME) 2>/dev/null || true
	$(DOCKER) volume create $(VOLUME_NAME)

# Seed database with initial data
seed:
	$(COMPOSE) --profile seed build seed
	$(COMPOSE) --profile seed run --rm seed

# Reset everything for clean rebuild (destructive)
nuke: down clean
	$(DOCKER) volume rm $(VOLUME_NAME) 2>/dev/null || true
	$(DOCKER) image rm $(SEED_IMAGE) $(IMAGE_NAME) 2>/dev/null || true
	$(DOCKER) volume create $(VOLUME_NAME)

versions:
	@cd $(PROJECT_DIR) && deno task check-deps || true