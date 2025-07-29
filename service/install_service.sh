#!/usr/bin/env bash

systemctl="systemctl --user --quiet"
service_dir="$HOME/.config/systemd/user/"

mkdir -p "$service_dir"

cp orw-deno.service "$service_dir"

(
    $systemctl daemon-reload
    $systemctl enable orw-deno
    $systemctl is-enabled orw-deno.service
)

# shellcheck disable=SC2181
if [ $? -eq 0 ]; then
    echo "OpenRouter API Watcher service sucessfully installed and enabled."
    echo
    echo "Start the service with:"
    echo "systemctl --user start orw-deno"
    echo
    echo "Check if the system is running with:"
    echo "systemctl --user status orw-deno"
    echo
    echo "See the log for the service with:"
    echo "journalctl --user -u orw-deno"
else
    echo "Service installation failed"
fi