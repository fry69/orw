#!/usr/bin/env bash

watcher_script="./server/dist/server/watcher.js"
dotenv_file="./.env.production.local"
required_node_version=$(cat .node-version)

if [ -n "$ORW_HOME" ]; then
    cd "$ORW_HOME" || (echo "cd $ORW_HOME failed" && exit 1)
fi

if [ ! -f "$dotenv_file" ]; then
    echo "Environment file not found" && exit 1
fi

## Make sure fnm is installed
export PATH="$HOME/.fnm:$PATH"
if ! command -v fnm &>/dev/null; then
    echo "fnm could not be found, installing it..."
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$HOME/.fnm"
    if ! command -v fnm &>/dev/null; then
        echo "fnm could not be installed, please install it manually" && exit 1
    fi
fi

## Source fnm
eval "$(fnm env)"

## Check if the required Node.js version is installed
if ! fnm list | grep -q "$required_node_version"; then
    echo "Required Node.js version $required_node_version is not installed, installing it..."
    fnm install "$required_node_version"
fi

## Use the required Node.js version
fnm use "$required_node_version"

set -o allexport
# shellcheck disable=SC1090
source "$dotenv_file"
set +o allexport

npm install --include dev && npm run build:prod && node "$watcher_script"
