#!/usr/bin/env bash

script="./watch-or.ts"

## Make sure Bun is installed

bun="$(command -v bun)"

if [ -x "$bun" ]
then
    echo "Bun is installed, running upgrade to assure latest version is installed"
    $bun upgrade
else
    echo "Bun is not installed, running install script"
    (
        curl -fsSL https://bun.sh/install | bash
    )
    bun="$HOME/.bun/bin/bun"
    if [ -x "$bun" ]
    then
        echo "Bun was successfully installed"
    else
        echo "Installation failed, please check above for error messages"
        exit 1
    fi
fi

if [ -n "$WATCHOR_HOME" ]
then
    cd "$WATCHOR_HOME" || echo "cd $WATCHOR_HOME failed" && exit 1
fi

if [ ! -f "$script" ]
then
    echo "Script not found, make sure this is the correct working directory"
    exit 1
fi

$bun run $script
