# deploy/

Production deployment artifacts: droplet bootstrap, shared gateway, and per-
app compose files. This directory is **only** code shipped to the droplet; the
application source lives under [`packages/`](../packages).

The repo-wide deployment story — GitHub Actions, secrets, URL scheme, and
operations — lives in [`../DEPLOY.md`](../DEPLOY.md). This file is the map
to the contents of this directory.

---

## Directory structure

```
deploy/
├── README.md                  # this file
├── setup-droplet.sh           # one-shot bootstrap for a fresh Ubuntu droplet
├── gateway/                   # shared Caddy gateway — owns :80 and :443
│   ├── README.md
│   ├── Caddyfile              # TLS, security headers, per-app routes
│   ├── docker-compose.yml     # single caddy service, per-app networks
│   ├── .env.example           # SITE_ADDRESS=<ip>.sslip.io
│   └── landing/
│       └── index.html         # "/" root listing of apps
├── emblem/                    # Emblem Cards app compose
│   ├── README.md
│   ├── docker-compose.yml     # emblem-web + emblem-server
│   └── .env.example           # SITE_ADDRESS, GH_REPO, IMAGE_TAG
└── dcc/                       # Dungeon Crawler Carl app slot
    └── README.md
```

On the droplet, each top-level app directory lands at `/opt/apps/<name>/`,
except `gateway/` which lands at `/opt/apps/_gateway/` (the underscore
prefix makes it sort first in `ls` output).

---

## Key design choices

### Per-app docker networks, not a shared bus

The gateway is the only container attached to every app's network. Sibling
apps cannot reach each other's containers. This prevents lateral movement
after a compromise of any one app.

```
gateway (caddy)   ──attaches to──▶   gateway_emblem, gateway_dcc
emblem-server     ──attaches to──▶   gateway_emblem only
emblem-web        ──attaches to──▶   gateway_emblem only
dcc-web           ──attaches to──▶   gateway_dcc only
```

The networks are declared `external: true` in each compose file and are
created once by [`setup-droplet.sh`](./setup-droplet.sh).

### One TLS endpoint, path-prefix routing

Caddy terminates TLS once for the whole droplet. Each app is a path
prefix (`/emblem/*`, `/dcc/*`), handled by a `handle_path` block that
strips the prefix before proxying. Apps stay portable across mount
points and never have to know where they're hosted.

### No host-port binding for apps

Only the gateway binds host ports. Every other container is reachable
only through the gateway. The attack surface exposed to the public
internet is one Caddy process on `:80` and `:443`.

### Real client IPs reach the backend

Caddy explicitly strips any client-supplied `X-Forwarded-For` header and
replaces it with the actual remote host. Without this, a malicious client
could spoof their IP and bypass the server's per-IP rate limits. See the
`request_header -X-Forwarded-For` directive in
[`gateway/Caddyfile`](./gateway/Caddyfile).

### Hardened containers

Every container runs with `cap_drop: [ALL]`, `security_opt:
no-new-privileges`, resource limits, and (where possible) `read_only: true`
with explicit `tmpfs:` mounts for runtime-writable paths. The gateway's
extra `cap_add: [NET_BIND_SERVICE]` lets Caddy bind `:80` / `:443` as a
non-privileged process.

### Images are pinned

Base images (`node:22.11-slim`, `caddy:2.8-alpine`) are pinned to specific
minor tags so a breaking upstream release doesn't land on the next
`docker compose pull`. App images are referenced by commit SHA
(`IMAGE_TAG=<sha>`), not `latest`. The compose files use
`${IMAGE_TAG:?...}` so a missing env var fails loudly.

---

## Bringing up the droplet

1. Run [`setup-droplet.sh`](./setup-droplet.sh) once — see inline comments
   and [`../DEPLOY.md`](../DEPLOY.md#one-time-droplet-setup) for the
   invocation.
2. Configure GitHub Actions secrets (`DROPLET_HOST`, `DROPLET_USER`,
   `DROPLET_SSH_KEY`, `SITE_ADDRESS`, `GHCR_READ_TOKEN`).
3. Push to `main`. CI builds, scans, pushes images, SCPs files, and
   restarts containers.

For a manual first boot or recovery, see each subdirectory's README.

---

## Security controls

See [`../docs/SECURITY.md`](../docs/SECURITY.md) for the consolidated list
spanning deploy, network, container, and application layers.
