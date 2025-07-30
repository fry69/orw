# Variables
DOCKER := podman
COMPOSE := podman-compose -f ./compose.yaml
PROJECT_DIR := orw-deno
IMAGE_NAME := orw
VOLUME_NAME := orw_data
SEED_IMAGE := orw_seed
EXTERNAL_PORT := 19913

# Export variables for docker-compose
export IMAGE_NAME
export VOLUME_NAME
export SEED_IMAGE
export PROJECT_DIR
export EXTERNAL_PORT

# BUILD_ARG := --build-arg GIT_REVISION=$$(git rev-parse HEAD)
# DENO_CACHE := ${HOME}/.cache/deno

# Default target
all:
	@echo "No task specified."

# Show current configuration
config:
	@echo "Current configuration:"
	@echo "  DOCKER: $(DOCKER)"
	@echo "  PROJECT_DIR: $(PROJECT_DIR)"
	@echo "  IMAGE_NAME: $(IMAGE_NAME)"
	@echo "  VOLUME_NAME: $(VOLUME_NAME)"
	@echo "  SEED_IMAGE: $(SEED_IMAGE)"
	@echo "  EXTERNAL_PORT: $(EXTERNAL_PORT)"

# Build the container images
build-app:
	$(COMPOSE) build app

# Build the seed image
build-seed:
	$(COMPOSE) --profile seed build seed

# Build all images
build: build-seed
	$(COMPOSE) build

# Start services using podman-compose (will build if needed)
up: clean
	$(COMPOSE) up --detach

# Start services and force rebuild
up-build: clean
	$(COMPOSE) up --build --detach

# Stop services using podman-compose
down:
	$(COMPOSE) down

# Show status of services
status: logs
	$(COMPOSE) ps

# Show status of services
logs:
	$(COMPOSE) logs

# Remove all containers
clean:
	$(DOCKER) rm --all
	$(DOCKER) image prune -f

# List all containers
list:
	$(DOCKER) ps -a

# Clean up generated files and directories, should not be necessary with .dockerignore
prune:
	rm -fR $(PROJECT_DIR)/node_modules
	rm -fR $(PROJECT_DIR)/_fresh
	rm -fR $(PROJECT_DIR)/data

# Delete an recreate the volume holding data (destructive obviously)
reset: down clean
	$(DOCKER) volume rm $(VOLUME_NAME)
	$(DOCKER) volume create $(VOLUME_NAME)

# Seeding volume with initial database, requires seed service to be built
seed: build-seed
	$(COMPOSE) --profile seed run --rm seed

# Nuke everything for a clean rebuild
nuke: reset
	$(DOCKER) image rm $(SEED_IMAGE) $(IMAGE_NAME)