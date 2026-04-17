# deploy/dcc/

Placeholder for a sibling app (Dungeon Crawler Carl) that shares the droplet
with Emblem Cards behind the same gateway. There's no compose file in this
repo yet — the directory exists so the gateway's routing and docker-network
plumbing is in place when DCC is ready to ship.

## What the gateway already provides

- **Route:** `handle_path /dcc/*` in [`../gateway/Caddyfile`](../gateway/Caddyfile)
  reverse-proxies to `dcc-web:80` after stripping the `/dcc/` prefix. The
  block also includes `request_header -X-Forwarded-For` so any backend
  that rate-limits by client IP receives the real remote host.
- **Network:** `gateway_dcc` docker network, created by
  [`../setup-droplet.sh`](../setup-droplet.sh). The gateway Caddy attaches
  to this network. DCC's containers must attach to this network (and
  nothing else) so they're reachable from the gateway but isolated from
  the emblem containers.
- **TLS:** Served transparently through the shared gateway's Let's Encrypt
  certificate.

## What DCC needs to provide

Drop `/opt/apps/dcc/docker-compose.yml` on the droplet with:

- A service named **`dcc-web`** (the name must match the gateway route).
- `networks: [gateway]` where `gateway` is declared as an external
  network aliased to `gateway_dcc`.
- No host-port bindings (`ports:` empty). The gateway is the only public
  ingress.
- Base path `/dcc/` baked into the build (Vite: `VITE_BASE_PATH=/dcc/`,
  equivalent in other frameworks) so asset URLs and client-side routers
  line up with the mount point.

Minimal skeleton:

```yaml
services:
  dcc-web:
    image: ghcr.io/<owner>/<repo>/dcc:<sha>
    container_name: dcc-web
    restart: unless-stopped
    networks:
      - gateway
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    tmpfs:
      - /tmp
      - /config
      - /data
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 64M

networks:
  gateway:
    name: gateway_dcc
    external: true
```

Then from the droplet:

```sh
cd /opt/apps/dcc
docker compose pull
docker compose up -d
```

DCC is live at `https://<site>/dcc/`. Caddy already has the route; no
gateway restart needed.

## Isolation

DCC containers live on `gateway_dcc`, not on `gateway_emblem`. The two
apps cannot reach each other's containers by name or IP — the gateway is
the only shared surface. This is the default posture; breaking it would
require explicitly adding `gateway_emblem` to DCC's `networks:` list.
