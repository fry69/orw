#!/usr/bin/env bash

export NODE_ENV=production

pnpm run build:prod && pnpm run start:server:prod
