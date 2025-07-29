all:
	@echo "No task speicifed."

build:
	podman build --build-arg GIT_REVISION=$(git rev-parse HEAD) -t orw-deno -f ./podman/Containerfile orw-deno

up:
	podman-compose -f ./podman/compose.yaml up

down:
	podman-compose -f ./podman/compose.yaml down

status:
	podman-compose -f ./podman/compose.yaml ps

clean:
	podman rm --all

list:
	podman ps -a

prune:
	rm -fR orw-deno/node-modules
	rm -fR orw-deno/_fresh
	rm -fR orw-deno/data
