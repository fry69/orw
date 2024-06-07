## TLS/HTTPS frontend

It is strongly recommended to use a HTTPS proxy like [Caddy](https://caddyserver.com/) for serving `orw` on a public host, also some RSS feed reader may require HTTPS for communication. Setting up a reverse proxy with `Caddy` with a Caddyfile is [extremely simple](https://caddyserver.com/docs/caddyfile/patterns#reverse-proxy), apart from setting up your DNS record, `Caddy` will then take care for getting TLS certificates and serving HTTPS to the outside world.

## How to install the OpenRouter API Watcher as a systemd user service

1. As `superuser` create a fresh user (e.g. `orw`) with

```shell
adduser orw
```

2. Enable lingering for the `orw` user, so that the service will keep running when the `orw` user logs out

```shell
loginctl enable-linger orw
```

3. As `orw` install orw with git and cd into the cloned repository

```shell
git clone https://github.com/fry69/orw
cd orw
```

4. Create a production environment and edit it (make sure `ORW_PORT` and `ORW_URL` match reverse proxy settings)

```shell
cp .env.example .env.production
vim .env.production
```

5. (optional) Download a seed database from `orw.karleo.net`

```shell
curl -o orw.db.gz https://orw.karleo.net/orw.db.gz
gzip -d orw.db.gz
mv orw.db data/orw.db
```

6. Install the systemd service

```shell
sh ./tools/install_service.sh
```

7. After successfull installation, start the service and check the status (the service will automatically install/update `bun`, install/update modules and build the web client)

```shell
systemctl --user start orw
systemctl --user status orw
```

8. (optional) Check log file and the systemd journal later

```shell
tail orw.log
journalctl --user -u orw -f
```

9. (optional) Update the `orm` repository at later time and restart the watcher

```shell
cd orw
git pull --rebase
systemctl --user restart orw
journalctl --user -u orw -f
```
