#!/usr/bin/env bash

systemctl="systemctl --user --quiet"
service_dir="$HOME/.config/systemd/user/"

mkdir -p "$service_dir"

cp "./tools/orw.service" "$service_dir"

(
    $systemctl daemon-reload
    $systemctl enable orw
    $systemctl is-enabled orw.service
)

# shellcheck disable=SC2181
if [ $? -eq 0 ]; then
    echo "OpenRouter API Watcher service sucessfully installed"
else
    echo "Service installation failed"
fi
