# Self-hosting ProAvalon

## Overview

This repo now supports a dedicated **self-host mode** for intranet-friendly deployments.

The self-host flow:
- runs the **ProAvalon app directly** with Node + pnpm
- runs **MongoDB** and **MinIO** with Docker Compose
- keeps both under **tmux**
- writes a managed ProAvalon block into `~/Caddyfile`
- proxies uploaded assets through the same public origin, so browsers only need the site URL
- installs dependencies deterministically with pnpm, using `pnpm-lock.yaml` when present and otherwise importing one from `yarn.lock`

Default public URL:
- `http://avalon.pinky.lilf.ir`

## Prerequisites

Install and have available on this machine:
- `tmux`
- `caddy`
- `docker`
- `docker compose`
- `pnpm`
- `zsh`
- `nvm-load` in your login shell (`~/.shared.sh` on this host)

The script uses:
```zsh
nvm-load
nvm use VERSION
```

If you need a proxy for package downloads, export the usual proxy vars before running the script. The script does **not** hardcode them; it just passes through whatever is already present.

Proxy note:
- the app/pnpm steps inherit your current proxy env vars
- Docker does **not** inherit those proxy env vars from the script; Docker is run with proxy vars unset so it can use the host's own daemon/mirror configuration (for example `/etc/docker/daemon.json`)
- for Docker Hub images, the self-host script also resolves the image reference through the first configured registry mirror from `/etc/docker/daemon.json` (or `SELF_HOST_REGISTRY_MIRROR` if set)

## Dependency determinism

Self-host installs are pinned by pnpm lock data.

That means:
- `setup` / `redeploy` use `pnpm install --frozen-lockfile`
- if `pnpm-lock.yaml` is missing, the script first runs `pnpm import` from the repo's committed `yarn.lock`
- dependency resolution stays tied to checked-in lock data instead of drifting to newer semver matches

## Commands

From the repo root:

```zsh
./self_host.zsh setup [public_url]
./self_host.zsh redeploy
./self_host.zsh start
./self_host.zsh stop
```

### `setup`
`setup` always does:
1. stop existing ProAvalon self-host services
2. choose/persist runtime config
3. install dependencies with `pnpm --frozen-lockfile` (importing from `yarn.lock` first if needed)
4. build the app
5. update `~/Caddyfile`
6. start MongoDB + MinIO + the app

Example:
```zsh
./self_host.zsh setup
./self_host.zsh setup http://avalon.example.internal
```

### `redeploy`
Rebuilds from the latest local working tree and restarts everything using the saved config.

### `start`
Starts the saved self-host configuration without rebuilding.

### `stop`
Stops the tmux sessions and brings down the Docker Compose infra.

## What gets created

State lives under:
- `.self_host/config.env`
- `.self_host/app.env`
- `.self_host/docker-compose.yml`
- `.self_host/logs/`
- `.self_host/data/mongodb/`
- `.self_host/data/minio/`

Tmux sessions:
- `proavalon-selfhost-app`
- `proavalon-selfhost-infra`

Useful tmux commands:
```zsh
tmux ls

tmux attach -t proavalon-selfhost-app
tmux attach -t proavalon-selfhost-infra
```

## Port handling

The self-host script checks whether the preferred internal ports are already in use.

Preferred defaults:
- app: `3301`
- mongo: `27017`
- minio: `9000`

If one is already occupied during `setup`, the script automatically picks the next free port and saves it in `.self_host/config.env`.

## Caddy integration

`setup`, `redeploy`, and `start` all maintain a managed block in `~/Caddyfile`:
- app traffic is reverse proxied to the app port
- `/${bucket}/...` object traffic is reverse proxied to MinIO

That keeps uploaded avatars/assets same-origin with the site URL.

The managed block markers are:
- `# BEGIN ProAvalon self-host`
- `# END ProAvalon self-host`

## Self-host auth behavior

Self-host mode (`ENV=selfhost`) changes auth behavior to fit intranet use:
- captcha checks are disabled
- VPN checks are disabled
- email verification is not required
- password reset by email is disabled
- the front page defaults to a **quick name-only account flow**

### Quick accounts

The quick flow:
1. asks only for a display name
2. creates a random password/token server-side
3. stores that token in browser `localStorage`
4. logs the user in immediately

On the front page, users can:
- continue as the saved quick account
- reveal the saved token
- copy the token over HTTP
- forget the saved token on the current device

On the profile edit page, quick-account users can:
- reveal the saved token again
- copy it
- rotate it to a fresh token
- forget the saved token on the current device

Important:
- the token is stored only on the browser/device that saved it
- if you want to use the account on another device, reveal or copy the token first and then log in with the legacy username/password form there

## Troubleshooting

### View logs
```zsh
tmux attach -t proavalon-selfhost-app
tmux attach -t proavalon-selfhost-infra
```

### Check saved config
```zsh
cat .self_host/config.env
```

### Check the managed Caddy block
```zsh
sed -n '/BEGIN ProAvalon self-host/,/END ProAvalon self-host/p' ~/Caddyfile
```

### If Caddy reload fails
Validate manually:
```zsh
caddy validate --config ~/Caddyfile --adapter caddyfile
```

### If a port is unexpectedly busy
Inspect listeners:
```zsh
ss -ltnp
```
Then rerun `./self_host.zsh setup` to have the script choose free replacements.

### If app dependencies fail to download
Export your proxy env vars first, then rerun `setup` or `redeploy`.
