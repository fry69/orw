# Variables
DOCKER := podman
CONTAINERFILE := ./docker/Containerfile
COMPOSE := podman-compose -f ./docker/compose.yaml
PROJECT_DIR := orw-deno
IMAGE_NAME := orw-deno
VOLUME_NAME := orw_data
SEED_IMAGE :=

# BUILD_ARG := --build-arg GIT_REVISION=$$(git rev-parse HEAD)
# DENO_CACHE := ${HOME}/.cache/deno

# Default target
all:
	@echo "No task specified."

# Build the container image
build:
	$(DOCKER) build $(BUILD_ARG) -t $(IMAGE_NAME) -f $(CONTAINERFILE) $(PROJECT_DIR)
# 	$(DOCKER) build $(BUILD_ARG) -v $(DENO_CACHE):/deno-dir -t $(IMAGE_NAME) -f $(CONTAINERFILE) $(PROJECT_DIR)

# Start services using podman-compose
up: clean
	$(COMPOSE) up --detach

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

# Clean up generated files and directories, should not be necessay with .dockerignore
prune:
	rm -fR $(PROJECT_DIR)/node_modules
	rm -fR $(PROJECT_DIR)/_fresh
	rm -fR $(PROJECT_DIR)/data

# Delete an recreate the volume holding the data
reset: down
	$(DOCKER) volume rm $(VOLUME_NAME)
	$(DOCKER) volume create $(VOLUME_NAME)

# Seeding volume with initial database, requires an image with seed data in it
seed:
  $(DOCKER) run --rm -v $(VOLUME_NAME):/data $(SEED_IMAGE) cp -r /seed/orw.db /data/
