# Dungeon Crawler Carl slot

The gateway already routes `/dcc/*` to a container named `dcc-web` on port 80.
Whatever you ship to that network with that name will get traffic.

To bring DCC up on this droplet, create `/opt/apps/dcc/docker-compose.yml`
with:

- A service named `dcc-web`
- Attached to the external `gateway` network
- No host port bindings
- Whatever `base` / path-prefix the app needs set to `/dcc/` at build time
  (same pattern as emblem — see the emblem Dockerfile for how Vite is wired)

Example skeleton:

```yaml
services:
  dcc-web:
    image: <your-image>
    container_name: dcc-web
    restart: unless-stopped
    networks:
      - gateway

networks:
  gateway:
    name: gateway
    external: true
```

Then `docker compose up -d` from `/opt/apps/dcc/` and DCC is live at
`https://<site>/dcc/`. No gateway restart needed — Caddy already has the
route.
