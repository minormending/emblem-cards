# Deploying Emblem Cards

Production runs on a single DigitalOcean droplet. A shared **Caddy gateway**
terminates TLS for every app hosted on the droplet, routing by URL path
prefix (`/emblem/`, `/dcc/`, …). App containers are built in GitHub Actions,
pushed to GHCR, and pulled on deploy.

TLS comes from Let's Encrypt. The droplet does not need a registered domain —
it uses a free **sslip.io** hostname derived from its public IP (e.g.
`159-203-108-80.sslip.io` for IP `159.203.108.80`).

> **Deep-dive docs for each layer:**
> - [`deploy/README.md`](./deploy/README.md) — whole-deploy overview
> - [`deploy/gateway/README.md`](./deploy/gateway/README.md) — shared Caddy, TLS, routing, security headers
> - [`deploy/emblem/README.md`](./deploy/emblem/README.md) — this app's compose
> - [`deploy/dcc/README.md`](./deploy/dcc/README.md) — sibling app slot
> - [`docs/SECURITY.md`](./docs/SECURITY.md) — application + deployment security controls in one place

---

## Droplet layout

```
/opt/apps/
├── _gateway/               # shared Caddy, owns :80 and :443
│   ├── docker-compose.yml
│   ├── Caddyfile
│   ├── landing/
│   │   └── index.html      # "/" listing of apps
│   └── .env                # SITE_ADDRESS
├── emblem/                 # Emblem Cards
│   ├── docker-compose.yml  # emblem-web + emblem-server
│   └── .env                # SITE_ADDRESS, GH_REPO, IMAGE_TAG
└── dcc/                    # Dungeon Crawler Carl
    └── docker-compose.yml
```

## Network topology

Apps do **not** share a single flat docker network. The gateway is the only
container attached to every app's network, so a compromise of `dcc-web` can
not reach `emblem-server`.

```
                                  ┌────────────────┐
                      host :443 ──▶│    caddy       │
                      host :80  ──▶│  (gateway)     │
                                  └──┬──────────┬──┘
                                     │          │
                        gateway_emblem│          │gateway_dcc
                                     ▼          ▼
                              ┌──────────┐  ┌─────────┐
                              │ emblem-* │  │ dcc-web │
                              └──────────┘  └─────────┘
```

- `gateway_emblem` — Caddy + `emblem-server` + `emblem-web`
- `gateway_dcc` — Caddy + `dcc-web`
- No app container binds a host port; the only public sockets are Caddy's
  `:80` and `:443`.

## URL scheme

| Public URL                             | Container              | Notes                                |
| -------------------------------------- | ---------------------- | ------------------------------------ |
| `https://<site>/`                      | gateway (landing)      | Tiny static index of apps.           |
| `https://<site>/emblem/`               | `emblem-web`           | React client, Vite build.            |
| `https://<site>/emblem/socket.io/`     | `emblem-server`        | Socket.IO handshake + upgrade.       |
| `https://<site>/dcc/`                  | `dcc-web`              | Sibling app.                         |

Caddy strips the `/<prefix>/` before proxying, so upstream services see
plain `/`-rooted paths and stay portable across mount points.

---

## One-time droplet setup

On a fresh Ubuntu 22.04 or 24.04 droplet, as root:

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/<OWNER>/<REPO>/main/deploy/setup-droplet.sh) \
  deploy "ssh-ed25519 AAAA... your-deploy-pubkey"
```

The script (see [`deploy/setup-droplet.sh`](./deploy/setup-droplet.sh)):

1. Installs Docker from the upstream apt repo.
2. Creates the `deploy` non-root user and installs your public key.
3. Hardens SSH: `PermitRootLogin no`, `PasswordAuthentication no`, key-only.
4. Installs and enables **UFW** (allows `22/80/443`, denies everything else).
5. Installs and enables **fail2ban** (default sshd jail).
6. Installs **unattended-upgrades** for security patches.
7. Creates `/opt/apps/{_gateway,emblem,dcc}` owned by `deploy:deploy`.
8. Creates the shared docker networks `gateway_emblem` and `gateway_dcc`.

Existing droplets provisioned before the network split still have the
legacy `gateway` network. Re-running this script is idempotent and creates
the new networks alongside it — the old network becomes orphaned but
harmless; remove it once nothing uses it with
`docker network rm gateway`.

### Seed app directories

The GitHub Actions deploy writes Compose files + `.env` into the app
directories automatically. For a manual first boot you can place files
yourself:

```sh
# As the deploy user on the droplet:
cd /opt/apps/_gateway
# Copy Caddyfile, docker-compose.yml, landing/ here.
cat > .env <<EOF
SITE_ADDRESS=159-203-108-80.sslip.io
EOF
chmod 600 .env

cd /opt/apps/emblem
# Copy docker-compose.yml here.
cat > .env <<EOF
SITE_ADDRESS=159-203-108-80.sslip.io
GH_REPO=yourname/emblem-cards
IMAGE_TAG=<git-sha-to-deploy>
EOF
chmod 600 .env

# Pull the registry token and start.
docker login ghcr.io -u <user> -p <pat-with-read:packages>
cd /opt/apps/_gateway && docker compose up -d
cd /opt/apps/emblem  && docker compose pull && docker compose up -d
docker logout ghcr.io
```

First page load may take a few seconds while Caddy provisions the
Let's Encrypt certificate.

---

## GitHub Actions deploy

[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) fires on
every push to `main` and on manual dispatch. It:

1. **Builds** `server` and `client` Docker images.
2. **Pushes** to GHCR tagged with both the commit SHA and `latest`.
3. **Scans** both images with Trivy. Fixable HIGH or CRITICAL CVEs fail
   the workflow and surface in the repo's Security tab via SARIF upload.
4. **Copies** `deploy/gateway/*` and `deploy/emblem/docker-compose.yml`
   onto the droplet via scp, respecting the `/opt/apps/_gateway/` and
   `/opt/apps/emblem/` layout.
5. **Writes** `.env` files on the droplet with `chmod 600`.
6. **Pulls and restarts** containers:
   - Gateway first (so the shared networks + TLS are live).
   - Then emblem.
7. Docker credentials live in a per-run `mktemp -d` with a `trap` cleanup,
   so a failure mid-deploy cannot leave the GHCR PAT in the deploy user's
   `~/.docker/config.json`.

### Client build-args

The client Docker image bakes the production paths in at build time:

| Build arg            | Value                   | Why                                                  |
| -------------------- | ----------------------- | ---------------------------------------------------- |
| `VITE_BASE_PATH`     | `/emblem/`              | Asset URLs in `index.html` line up with the mount.   |
| `VITE_SOCKET_PATH`   | `/emblem/socket.io/`    | `socket.io-client` hits the path Caddy forwards.     |
| `VITE_SERVER_URL`    | *(empty)*               | Client uses `window.location.origin` (TLS via gw).   |

If you change the gateway route, bump these in the workflow.

### Required GitHub secrets

Under **Settings → Secrets and variables → Actions**:

| Secret               | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `DROPLET_HOST`       | Public IP (e.g. `159.203.108.80`).                           |
| `DROPLET_USER`       | `deploy`                                                     |
| `DROPLET_SSH_KEY`    | Private key for the deploy user (OpenSSH format).            |
| `SITE_ADDRESS`       | `159-203-108-80.sslip.io`                                    |
| `GHCR_READ_TOKEN`    | Classic PAT, `read:packages` scope only.                     |

Optionally create a **production** GitHub Environment for required-
reviewer gating of the deploy job.

---

## Adding a new app

1. Pick a path prefix, e.g. `/foo/`.
2. Build the app with the prefix baked in (Vite: `VITE_BASE_PATH=/foo/`,
   Socket.IO client: `/foo/socket.io/` if using websockets).
3. Add a `handle_path /foo/* { ... }` block to [the gateway
   Caddyfile](./deploy/gateway/Caddyfile). Include
   `request_header -X-Forwarded-For` inside each handle so the gateway
   sets X-Forwarded-For to the real client IP instead of appending to a
   client-supplied value.
4. Create a new docker network in [`setup-droplet.sh`](./deploy/setup-droplet.sh)
   (`gateway_foo`) and add it to the `networks:` list in the gateway
   compose.
5. Create `/opt/apps/foo/docker-compose.yml`. Attach only the app's own
   containers to `gateway_foo`; do not put them on other apps' networks.
6. `docker compose up -d` in both `/opt/apps/_gateway/` (to pick up the
   new network attachment) and `/opt/apps/foo/`.

---

## Operations

From the droplet, as `deploy`:

```sh
# Status
docker compose -f /opt/apps/_gateway/docker-compose.yml ps
docker compose -f /opt/apps/emblem/docker-compose.yml ps

# Live logs (tail last 100 lines, follow)
docker compose -f /opt/apps/emblem/docker-compose.yml logs -f --tail=100

# Restart one service after a config change
docker compose -f /opt/apps/_gateway/docker-compose.yml restart caddy

# Roll back to a previous image
vim /opt/apps/emblem/.env              # set IMAGE_TAG=<older-sha>
docker compose -f /opt/apps/emblem/docker-compose.yml pull
docker compose -f /opt/apps/emblem/docker-compose.yml up -d

# Clean up unused images after a few deploys
docker image prune -f
```

### Zero-downtime cert renewal

Caddy writes issued certs to the `caddy_data` volume (see
[`deploy/gateway/docker-compose.yml`](./deploy/gateway/docker-compose.yml)).
ACME renewal happens in-process automatically — no cron, no hooks.

If you ever replace the volume, first load of each app after restart will
pause for a few seconds while Caddy re-issues.

---

## Local development

Unchanged by all of the above: `pnpm dev` boots Vite + the server; the
client defaults to `http://localhost:3001` and the socket path defaults
to `/socket.io/`. The base-path and socket-path build args only apply to
production builds; Vite's `import.meta.env.BASE_URL` resolves to `/` in
dev so derived asset URLs (e.g. card art at `/cards/<id>.png`) just
work against the Vite dev server.

---

## Troubleshooting

| Symptom                                          | Likely cause                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Assets 404 / images blank in network tab         | Client was built without `VITE_BASE_PATH=/emblem/`. Rebuild with the build-arg.                       |
| Socket.io handshake fails on prod                | `VITE_SOCKET_PATH` missing or gateway handle block changed. Check `/emblem/socket.io/*` route.        |
| `docker compose up` fails with "network not found" | Droplet wasn't re-bootstrapped after the network split. Run [`setup-droplet.sh`](./deploy/setup-droplet.sh) again (idempotent). |
| Cert not issued                                  | UFW blocks :80, or ACME HTTP-01 challenge can't reach the droplet. Check `ufw status` and DNS.         |
| Rate-limit kicks legit players                   | X-Forwarded-For not being set. Check Caddy logs; confirm `request_header -X-Forwarded-For` is present. |
| Deploy workflow scans fail on HIGH CVE           | Bump the base image tag in both Dockerfiles (`node:22.11-slim`, `caddy:2.8-alpine`).                  |
