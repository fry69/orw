# Variables
DOCKER ?= podman
COMPOSE := $(DOCKER)-compose -f ./compose.yaml
PROJECT_DIR := packages/frontend
VENDOR_DIR := ./vendor
IMAGE_NAME := orw
VOLUME_NAME := orw_data

# S3/R2 configuration
ORW_STORAGE_BUCKET := dev-orw-all
ORW_STORAGE_PUBLIC_URL := https://dev-orw-assets.fry69.dev/

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
GIT_REVISION=$(shell git rev-parse HEAD)

# Build version including timestamp
ORW_BUILD_STRING := ORW $(shell date '+%Y%m%d-%H%M%S') (git $(shell git rev-parse --short HEAD))

# Export variables for docker-compose
export IMAGE_NAME
export VOLUME_NAME
export PROJECT_DIR
export EXTERNAL_PORT
export GIT_REVISION
export ORW_PUBLIC_URL
export ORW_REPOSITORY_URL
export NODE_ENV
export ORW_STORAGE_PUBLIC_URL
export ORW_BUILD_STRING

# Default target
all: help

# Show available targets
help:
	@echo "Available targets:"
	@echo "  config     - Show current configuration"
	@echo "  build      - Build all images"
	@echo "  up         - Start services"
	@echo "  rebuild    - Start services with rebuild"
	@echo "  down       - Stop services"
	@echo "  status     - Show service status and recent logs"
	@echo "  logs       - Follow service logs"
	@echo "  reset      - Reset volume (destructive)"
	@echo "  clean      - Remove containers and prune images"
	@echo "  nuke       - Reset everything for clean rebuild"
	@echo "  versions   - Check dependency versions"
	@echo "  pre        - Pre-commit checks and sanitizing"
	@echo "  dev        - Start the development server"

# Show current configuration
config:
	@echo "Current configuration:"
	@echo "  DOCKER:             $(DOCKER)"
	@echo "  PROJECT_DIR:        $(PROJECT_DIR)"
	@echo "  IMAGE_NAME:         $(IMAGE_NAME)"
	@echo "  VOLUME_NAME:        $(VOLUME_NAME)"
	@echo "  EXTERNAL_PORT:      $(EXTERNAL_PORT)"
	@echo "  ORW_PUBLIC_URL:     $(ORW_PUBLIC_URL)"
	@echo "  ORW_REPOSITORY_URL: $(ORW_REPOSITORY_URL)"
	@echo "  NODE_ENV:           $(NODE_ENV)"

# Build all images
build:
	$(COMPOSE) build

# Start services
up:
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
# 	rm -rf $(PROJECT_DIR)/node_modules $(PROJECT_DIR)/_fresh $(PROJECT_DIR)/data
	rm -rf node_modules deno.lock $(PROJECT_DIR)/_fresh

# Reset volume (destructive)
reset: down
	$(DOCKER) volume rm $(VOLUME_NAME) 2>/dev/null || true
	$(DOCKER) volume create $(VOLUME_NAME)

# Reset everything for clean rebuild (destructive)
nuke-db: down clean
	$(DOCKER) volume rm $(VOLUME_NAME) 2>/dev/null || true
	$(DOCKER) image rm $(IMAGE_NAME) 2>/dev/null || true
	$(DOCKER) volume create $(VOLUME_NAME)

# Reset Deno cache (destructive)
nuke-cache:
	$(DOCKER) volume rm deno_dir 2>/dev/null || true
	$(DOCKER) volume create deno_dir

# Helper function for printing lastest version from jsr.io for a package
# define get_latest_version
# 	@printf "Latest $(1) version: "
# 	@curl -s 'https://jsr.io/$(1)/meta.json' | jq -r '.versions | keys[]' | sort -V | tail -n1
# endef

# Show depenency versions to alert for outdated packages
versions:
	deno task check-deps || true
# 	$(call get_latest_version,@fresh/core)
# 	$(call get_latest_version,@fresh/plugin-tailwind)

# Pre-commit checking and sanitizing
pre:
	deno task pre-commit

# Start the development server
dev:
	@cd $(PROJECT_DIR) && ORW_PUBLIC_URL=http://localhost:5173 deno task dev

# Start the production server
serve:
	@cd $(PROJECT_DIR) && ORW_PUBLIC_URL=http://localhost:8000 deno task serve

# Find all emojis using ripgrep
emoji:
	@rg "[\p{Emoji_Presentation}\p{Extended_Pictographic}]" --type-add 'code:*.{py,js,ts,tsx,java,cpp,c,h}' -t code

# Create screenhot for Twitter card
screenshot:
	shot-scraper shot -h 630 -w 1280 ${ORW_PUBLIC_URL}/list -o temp/screenshot.png

# Upload screenshot to S3/R2 bucket
upload:
	wrangler r2 object put $(ORW_STORAGE_BUCKET)/screenshot.png -f temp/screenshot.png --remote

.PHONY: vendor
vendor:
	@rm -fR $(VENDOR_DIR)/fresh
	@mkdir -p $(VENDOR_DIR)/fresh
	@cp -a ../../denoland/fresh/deno.* ../../denoland/fresh/packages $(VENDOR_DIR)/fresh
	@mkdir -p $(VENDOR_DIR)/fresh/www
	@cp ../../denoland/fresh/www/deno.json $(VENDOR_DIR)/fresh/www
	@echo "Vendored fresh into $(VENDOR_DIR)/fresh"
	@echo "Size: $$(du -sh $(VENDOR_DIR)/fresh | cut -f1)"

pull:
	$(DOCKER) pull docker.io/denoland/deno:latest

inspect:
	npx serve $(PROJECT_DIR)/.vite-inspect

shell:
	$(DOCKER) exec -it orw_app_1 sh

check:
	deno task -r check
