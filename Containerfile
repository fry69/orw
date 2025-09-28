FROM docker.io/denoland/deno:latest AS build

## Deno cache folder
ENV DENO_DIR=/deno-dir/

# RUN deno upgrade canary

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno install --allow-scripts

RUN cd packages/frontend && deno task build

##
## Final image
##

FROM docker.io/denoland/deno:latest
WORKDIR /app
COPY --from=build /app/packages/frontend/_fresh ./_fresh

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
