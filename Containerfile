FROM docker.io/alpine:latest
ARG SEED_DB_FILE
COPY data/${SEED_DB_FILE} /seed/
