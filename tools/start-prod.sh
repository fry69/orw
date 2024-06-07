#!/usr/bin/env bash

export NODE_ENV=production

npm run build:prod && npm run start:server:prod
