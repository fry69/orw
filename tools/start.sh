#!/usr/bin/env bash

script="./orw.ts"
dotenv_file="./.env.production"

## Make sure Bun is installed
export PATH="$HOME/.bun/bin:$PATH"
bun="$(command -v bun)" || bun="$HOME/.bun/bin/bun"

if [ -x "$bun" ]; then
    echo "Bun is installed, running upgrade to assure latest version is installed"
    $bun upgrade
else
    echo "Bun is not installed, running install script"
    (
        curl -fsSL https://bun.sh/install | bash
    )
    bun="$HOME/.bun/bin/bun"
    if [ -x "$bun" ]; then
        echo "Bun was successfully installed"
    else
        echo "Installation failed, please check above for error messages"
        exit 1
    fi
fi

if [ -n "$ORW_HOME" ]; then
    cd "$ORW_HOME" || echo "cd $ORW_HOME failed" && exit 1
fi

if [ ! -f "$script" ]; then
    echo "Watcher script not found, make sure $PWD is the correct working directory"
    exit 1
fi

if [ ! -f "$dotenv_file" ]; then
    echo "Environment file not found"
fi

set -o allexport
# shellcheck disable=SC1090
source "$dotenv_file"
set +o allexport

$bun run start
