#!/usr/bin/env bash

export NODE_ENV=development

pnpm run build:dev && pnpm run start:server:dev
