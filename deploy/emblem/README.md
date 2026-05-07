# deploy/emblem/

Emblem Cards runtime on the droplet. Two containers — the Socket.IO server
and the static React bundle — both reached through the shared gateway at
`https://<site>/emblem/`.

On the droplet these files live at `/opt/apps/emblem/`.

---

## Files

| File                      | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| [`docker-compose.yml`](./docker-compose.yml) | `emblem-server` + `emblem-web`, both attached to `gateway_emblem`.    |
| [`.env.example`](./.env.example) | Template for `SITE_ADDRESS`, `GH_REPO`, `IMAGE_TAG`. Copy to `.env`. |

---

## Services

### `emblem-server` — authoritative game state

```yaml
image: ghcr.io/${GH_REPO}/server:${IMAGE_TAG:?IMAGE_TAG must be set}
```

- Node 22.11-slim image running `dist/index.js` as the non-root `node`
  user (see [`../../packages/server/Dockerfile`](../../packages/server/Dockerfile)).
- Listens on `3001` inside the container; nothing published to the host.
- `CLIENT_ORIGIN=https://${SITE_ADDRESS}` — Socket.IO enforces this on
  CORS and rejects cross-origin handshakes.
- Built-in `HEALTHCHECK` hits `/healthz` every 30s. Docker reports
  health to compose and to the gateway.
- Hardened: `read_only: true`, `cap_drop: [ALL]`,
  `security_opt: no-new-privileges:true`, CPU 1.0, memory 384 MB.

### `emblem-web` — static Vite build

```yaml
image: ghcr.io/${GH_REPO}/client:${IMAGE_TAG:?IMAGE_TAG must be set}
```

- Caddy 2.8-alpine serving the compiled React app from `/srv`.
- Listens on `:80` inside the container.
- `depends_on: [emblem-server]` — startup-order only, not
  `service_healthy`. If emblem-server is temporarily unhealthy, the
  client still comes up and retries the socket connection; that's better
  UX than blocking page loads on a transient backend hiccup.
- Hardened: `read_only: true` with `tmpfs: [/tmp, /config, /data]` (Caddy
  writes runtime state to the last two), `cap_drop: [ALL]` +
  `cap_add: [NET_BIND_SERVICE]`, CPU 0.25, memory 64 MB.
- Healthcheck is defined in the client Dockerfile
  (`wget --spider -q -T 3 http://127.0.0.1/`); compose inherits it.

---

## Image tags

Both images are **pinned by git SHA** — no `:latest` fallback. The
compose uses `${IMAGE_TAG:?IMAGE_TAG must be set}` so an accidentally
empty `.env` fails loudly instead of deploying stale bits:

```
error: IMAGE_TAG must be set
```

GitHub Actions writes the current commit SHA to `.env` on each deploy.
To roll back:

```sh
ssh deploy@<host>
vim /opt/apps/emblem/.env              # IMAGE_TAG=<older-sha>
docker compose -f /opt/apps/emblem/docker-compose.yml pull
docker compose -f /opt/apps/emblem/docker-compose.yml up -d
```

Images stay in GHCR for 90 days by default; pin longer if you care about
rollback depth.

---

## Network

Both services attach to the **`gateway_emblem`** docker network:

```yaml
networks:
  gateway:
    name: gateway_emblem
    external: true
```

The alias `gateway` is internal to this compose file; the actual docker
network name is `gateway_emblem`. The gateway Caddy attaches to the same
network via its own compose, which is how it resolves `emblem-server:3001`
and `emblem-web:80` by name.

Nothing else — no DCC container, no other sibling app — can reach these
services, because they're on a separate docker network.

---

## Real client IPs

`emblem-server` uses `X-Forwarded-For` to identify clients behind the
gateway. The gateway strips any incoming XFF before setting its own (see
[`../gateway/README.md`](../gateway/README.md#handle_path-emblem)), and the
server's [`clientIp()` helper](../../packages/server/src/index.ts) reads
the first entry with a fallback to the direct socket address.

Without this, rate-limit buckets and connection caps would all key on the
gateway's container IP, making them a no-op. With it, real client IPs
drive the limits and the gateway can't be confused by client-injected
headers.

---

## Manual ops

```sh
# Status + healthchecks
docker compose -f /opt/apps/emblem/docker-compose.yml ps

# Follow server logs
docker compose -f /opt/apps/emblem/docker-compose.yml logs -f emblem-server

# Restart only the server (keeps active web clients up)
docker compose -f /opt/apps/emblem/docker-compose.yml restart emblem-server

# Deep inspect
docker exec -it emblem-server sh
```

---

## Related

- [`../../packages/server/README.md`](../../packages/server/README.md) — what the server actually does
- [`../../packages/client/README.md`](../../packages/client/README.md) — the web build that runs in emblem-web
- [`../gateway/README.md`](../gateway/README.md) — routing and TLS
- [`../../docs/SECURITY.md`](../../docs/SECURITY.md) — security controls by layer
