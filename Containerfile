##
## Build stage
##

FROM docker.io/denoland/deno:latest AS build

## Deno cache folder
ENV DENO_DIR=/deno-dir/

# RUN deno upgrade canary && deno --version

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno install --allow-scripts

RUN cd packages/frontend && deno task build

##
## Copy only built artifacts to run the final image
##

FROM docker.io/denoland/deno:latest
WORKDIR /app
COPY --from=build /app/packages/frontend/_fresh ./_fresh

RUN deno install --allow-scripts --entrypoint _fresh/server.js

EXPOSE 8000

CMD ["serve", "-A", "_fresh/server.js"]

## Health check works only with Docker Engine, not with Podman
# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD deno eval "try { await fetch('http://localhost:8000/health'); } catch { Deno.exit(1); }"
