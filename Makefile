# Variables
DOCKER := podman
CONTAINERFILE := ./docker/Containerfile
COMPOSE := podman-compose -f ./docker/compose.yaml
PROJECT_DIR := orw-deno
IMAGE_NAME := orw-deno

# DENO_CACHE := ${HOME}/.cache/deno

# Default target
all:
	@echo "No task specified."

# Build the container image
build: prune
	$(DOCKER) build --build-arg GIT_REVISION=$$(git rev-parse HEAD) -t $(IMAGE_NAME) -f $(CONTAINERFILE) $(PROJECT_DIR)
# 	$(DOCKER) build --build-arg GIT_REVISION=$$(git rev-parse HEAD) -v $(DENO_CACHE):/deno-dir -t $(IMAGE_NAME) -f $(CONTAINERFILE) $(PROJECT_DIR)

# Start services using podman-compose
up: clean
	$(COMPOSE) up

# Stop services using podman-compose
down:
	$(COMPOSE) down

# Show status of services
status:
	$(COMPOSE) ps

# Remove all containers
clean:
	$(DOCKER) rm --all
	$(DOCKER) image prune -f

# List all containers
list:
	$(DOCKER) ps -a

# Clean up generated files and directories
prune:
	rm -fR $(PROJECT_DIR)/node_modules
	rm -fR $(PROJECT_DIR)/_fresh
	rm -fR $(PROJECT_DIR)/data
