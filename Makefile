# Variables
PROJECT_DIR := orw-deno
IMAGE_NAME := orw-deno
COMPOSE_FILE := ./podman/compose.yaml
CONTAINERFILE := ./podman/Containerfile

# Default target
all:
	@echo "No task specified."

# Build the container image
build: prune
	podman build --build-arg GIT_REVISION=$$(git rev-parse HEAD) -t $(IMAGE_NAME) -f $(CONTAINERFILE) $(PROJECT_DIR)

# Start services using podman-compose
up:
	podman-compose -f $(COMPOSE_FILE) up

# Stop services using podman-compose
down:
	podman-compose -f $(COMPOSE_FILE) down

# Show status of services
status:
	podman-compose -f $(COMPOSE_FILE) ps

# Remove all containers
clean:
	podman rm --all

# List all containers
list:
	podman ps -a

# Clean up generated files and directories
prune:
	rm -fR $(PROJECT_DIR)/node_modules
	rm -fR $(PROJECT_DIR)/_fresh
	rm -fR $(PROJECT_DIR)/data
