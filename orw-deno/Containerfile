FROM docker.io/denoland/deno:latest

## Deno cache folder
ENV DENO_DIR=/deno-dir/

WORKDIR /app

COPY deno.json deno.lock ./
RUN deno install --allow-scripts

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY . .

RUN deno task build

## Official docs still recommend 'deno cache' -> https://fresh.deno.dev/docs/canary/deployment/docker
RUN deno cache --allow-scripts _fresh/server.js
# RUN deno install --allow-scripts--entrypoint _fresh/server.js

# RUN deno cache --allow-scripts dev.ts

EXPOSE 8000

## Production version
CMD ["serve", "-A", "_fresh/server.js"]

# CMD ["task", "dev"]

##
# HEALTHCHECK --interval=30s --timeout=3s \
#   CMD deno eval "try { await fetch('http://localhost:8000/health'); } catch { Deno.exit(1); }"
