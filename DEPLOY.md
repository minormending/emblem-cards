# Deploy

Production runs on a single DigitalOcean droplet with one shared **Caddy
gateway** terminating TLS for multiple apps, each at its own URL path
(`/emblem/`, `/dcc/`, …). Apps are built as Docker images in GitHub Actions,
pushed to GHCR, and pulled by the droplet on deploy.

The droplet has no domain — TLS uses a free **sslip.io** hostname derived
from the public IP (e.g. `159-203-108-80.sslip.io`).

## Layout

```
/opt/apps/
├── _gateway/              # shared Caddy (owns :80 and :443)
│   ├── docker-compose.yml
│   ├── Caddyfile
│   ├── landing/           # root "/" listing page
│   └── .env               # SITE_ADDRESS
├── emblem/                # this app
│   ├── docker-compose.yml # emblem-web + emblem-server
│   └── .env
└── dcc/                   # Dungeon Crawler Carl
    └── docker-compose.yml
```

Containers attach to an external docker network `gateway`. The Caddy gateway
reverse-proxies by path prefix; each app's containers expose nothing to the
host.

## URL scheme

- `https://<site>/` — landing page listing the apps
- `https://<site>/emblem/` — Emblem Cards web client
- `https://<site>/emblem/socket.io/` — Emblem Cards server
- `https://<site>/dcc/` — Dungeon Crawler Carl

## One-time droplet setup

On a fresh Ubuntu 22.04/24.04 droplet, as root:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/<OWNER>/<REPO>/main/deploy/setup-droplet.sh) \
  deploy "ssh-ed25519 AAAA... your-deploy-pubkey"
```

This installs Docker, creates a `deploy` user with your pubkey, hardens SSH
(no root, no passwords), enables UFW (22/80/443) + fail2ban + unattended
security upgrades, creates `/opt/apps/{_gateway,emblem,dcc}`, and creates
the external `gateway` docker network.

Then, still on the droplet, populate the app directories:

```sh
cd /opt/apps/_gateway
# copy deploy/gateway/{Caddyfile,docker-compose.yml,landing/,.env.example} here
cp .env.example .env && vim .env   # set SITE_ADDRESS=<ip-with-dashes>.sslip.io

cd /opt/apps/emblem
# copy deploy/emblem/{docker-compose.yml,.env.example} here
cp .env.example .env && vim .env   # set SITE_ADDRESS + GH_REPO

docker login ghcr.io   # with a read:packages PAT

cd /opt/apps/_gateway && docker compose up -d
cd /opt/apps/emblem   && docker compose pull && docker compose up -d
```

Caddy auto-provisions a Let's Encrypt cert on first request. First page load
may take a few seconds while the cert is issued.

## GitHub secrets

Under repo **Settings → Secrets → Actions**:

| Secret              | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| `DROPLET_HOST`      | droplet public IP (e.g. `159.203.108.80`)                             |
| `DROPLET_USER`      | `deploy`                                                              |
| `DROPLET_SSH_KEY`   | private key matching the pubkey on the droplet                        |
| `SITE_ADDRESS`      | `159-203-108-80.sslip.io`                                             |
| `GHCR_READ_TOKEN`   | GitHub PAT (classic) with `read:packages` scope                       |

Create a GitHub Environment named `production` for optional required-reviewers
gating of the deploy job.

## Adding a new app

1. Pick a path prefix (e.g. `/foo/`).
2. Build the app mounted at that prefix (Vite: `VITE_BASE_PATH=/foo/`;
   equivalent in other frameworks).
3. Add a `handle_path /foo/* { reverse_proxy foo-web:80 }` block to the
   gateway Caddyfile.
4. Create `/opt/apps/foo/docker-compose.yml` with a service named `foo-web`
   attached to the external `gateway` network; no host ports.
5. `docker compose up -d` in both `/opt/apps/_gateway/` (to reload Caddy) and
   `/opt/apps/foo/`.

## What ships where

- `ghcr.io/<owner>/<repo>/server:<sha>` — Node 22 slim, socket.io on 3001
  internal, no host port. Event-level rate-limited.
- `ghcr.io/<owner>/<repo>/client:<sha>` — Caddy 2 serving the Vite build at
  port 80 internal. Built with `VITE_BASE_PATH=/emblem/` and
  `VITE_SOCKET_PATH=/emblem/socket.io/`.
- `caddy:2-alpine` for the gateway; no custom image.

## Security posture

- **TLS:** Caddy auto-provisions Let's Encrypt; single endpoint for all apps.
- **Headers:** HSTS (1-year, includeSubDomains), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: geolocation=(), microphone=(), camera=()`, server banner hidden.
- **Network:** UFW denies all inbound except 22/80/443; app containers don't
  bind host ports.
- **Containers:** `read_only` rootfs where possible, `cap_drop: ALL`,
  `no-new-privileges`, non-root user, CPU + memory limits per service.
- **SSH:** key-only, root login disabled, `PasswordAuthentication no`,
  fail2ban on sshd.
- **Updates:** unattended-upgrades for security patches.
- **Rate limiting:** 30 events/sec per socket on the emblem server; offenders
  disconnected.
- **Secrets:** `.env` files on droplet `chmod 600`; GHCR creds are short-lived
  `docker login` per deploy, logged out after.
- **Logs:** Docker JSON file driver, 10MB × 3 rotated.

## Manual ops

From the droplet, as `deploy`:

```sh
# status
docker compose -f /opt/apps/_gateway/docker-compose.yml ps
docker compose -f /opt/apps/emblem/docker-compose.yml ps

# logs
docker compose -f /opt/apps/emblem/docker-compose.yml logs -f --tail=100

# restart one service
docker compose -f /opt/apps/emblem/docker-compose.yml restart emblem-server

# roll back to a prior image
vim /opt/apps/emblem/.env              # IMAGE_TAG=<older-sha>
docker compose -f /opt/apps/emblem/docker-compose.yml pull
docker compose -f /opt/apps/emblem/docker-compose.yml up -d
```

## Local dev

Unchanged: `pnpm dev` boots Vite + the server; the client defaults to
`http://localhost:3001` and the socket path defaults to `/socket.io/`. The
base-path + socket-path envs only apply to production builds.
