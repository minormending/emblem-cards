# deploy/gateway/

Shared Caddy gateway: single public endpoint for every app on the droplet.
Terminates TLS, serves a tiny landing page at `/`, reverse-proxies each app
by URL prefix.

On the droplet these files live at `/opt/apps/_gateway/`. Nothing here is
app-specific — adding a new app means adding a network + `handle_path`
block, not rewriting the gateway.

---

## Files

| File                 | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| [`Caddyfile`](./Caddyfile) | TLS site block, security headers, per-app routing rules.                |
| [`docker-compose.yml`](./docker-compose.yml) | Single `caddy` service, per-app networks, volumes for cert + config persistence. |
| [`.env.example`](./.env.example) | Template for `SITE_ADDRESS`. Copy to `.env` on the droplet.         |
| `landing/index.html` | Static HTML served at `/` — tiny list of apps hosted on the droplet.   |

---

## The Caddyfile, section by section

### Global options

```
{
  admin off
}
```

Disables the Caddy admin API on `:2019`. Without this, a container on any
network the gateway is attached to could reload the config or read TLS
state. Config reloads in production happen via `docker compose restart
caddy` (or a `docker compose up -d` after editing the Caddyfile).

### TLS site — `{$SITE_ADDRESS}`

`{$SITE_ADDRESS}` expands to whatever the `SITE_ADDRESS` env var holds
(e.g. `159-203-108-80.sslip.io`). Caddy auto-provisions a Let's Encrypt
certificate for that hostname on first boot; ACME HTTP-01 challenge runs
on `:80` and renewals happen in-process.

### Security headers

Every response carries:

| Header                             | Value                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Strict-Transport-Security`        | `max-age=31536000; includeSubDomains; preload`                                                  |
| `X-Content-Type-Options`           | `nosniff`                                                                                       |
| `X-Frame-Options`                  | `DENY`                                                                                          |
| `Referrer-Policy`                  | `strict-origin-when-cross-origin`                                                               |
| `Permissions-Policy`               | `geolocation=(), microphone=(), camera=()`                                                      |
| `Content-Security-Policy`          | `default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `Server`                           | *removed*                                                                                       |

`'unsafe-inline'` for `style-src` is required by Tailwind's arbitrary-value
utilities (e.g. `text-[10px]`) which emit inline `style=` attributes at
build time. Everything else locks to same-origin.

### `handle_path /emblem/*`

Routes the Emblem Cards paths. Before each `reverse_proxy`:

```
request_header -X-Forwarded-For
reverse_proxy emblem-server:3001   # or emblem-web:80
```

Without the `-X-Forwarded-For` strip, Caddy's `reverse_proxy` *appends* the
client IP to any existing header. A malicious client can inject
`X-Forwarded-For: 1.2.3.4` and the server would see that as the first
entry. Stripping forces Caddy's own value to be the single entry — the
real remote host — which the server parses as the authoritative client IP
for per-IP rate limiting and connection capping.

`@socketio path /socket.io/*` splits websocket / long-poll handshakes to
`emblem-server:3001`; everything else goes to the static `emblem-web:80`.

### `handle_path /dcc/*`, `handle { file_server }`

Same pattern for DCC. The final catch-all serves the landing page from
`/srv/landing` (bind-mounted from the `landing/` directory next to this
README).

### `http://{$SITE_ADDRESS}` redirect

Catches bare HTTP hits and redirects to HTTPS. Caddy normally does this
for you via its auto-HTTPS feature, but an explicit block makes the
behavior visible.

---

## The compose file

Key decisions in [`docker-compose.yml`](./docker-compose.yml):

- **Image pin:** `caddy:2.8-alpine`. Minor-tag pin catches security
  patches without risking a breaking major bump.
- **`ports:`** only `:80` and `:443` published to the host.
- **Per-app networks:** `emblem` → `gateway_emblem`, `dcc` → `gateway_dcc`.
  Caddy is the only container attached to more than one app's network.
  Both are declared `external: true` and are created by
  [`../setup-droplet.sh`](../setup-droplet.sh).
- **Volumes:** `caddy_data:/data` and `caddy_config:/config` persist certs
  and runtime state across container restarts.
- **Hardening:**
  - `cap_drop: [ALL]` + `cap_add: [NET_BIND_SERVICE]` — Caddy can bind
    privileged ports but nothing else.
  - `read_only: true` with `tmpfs: [/tmp]`.
  - `security_opt: no-new-privileges:true`.
- **No healthcheck** — Caddy only has site blocks for `$SITE_ADDRESS`, so
  a request to `http://127.0.0.1/` with `Host: 127.0.0.1` returns 404.
  Custom health probes would need to spoof the Host header; it's not
  worth the complexity. Docker's `restart: unless-stopped` covers crashes.
- **Logging:** JSON-file driver, 10 MB × 3 files rotated.
- **Resource limits:** CPU 0.5, memory 128 MB.

---

## Editing the Caddyfile

1. Change [`Caddyfile`](./Caddyfile) in the repo.
2. Push to `main`. Deploy workflow SCPs it to `/opt/apps/_gateway/Caddyfile`
   and restarts the caddy service via `docker compose up -d`.

For an urgent hotfix directly on the droplet:

```sh
ssh deploy@<host>
sudo -u deploy vim /opt/apps/_gateway/Caddyfile
docker compose -f /opt/apps/_gateway/docker-compose.yml restart caddy
```

Reverse the edit into the repo afterwards so the next deploy doesn't
overwrite your hotfix.

---

## Adding a new app

See [`../README.md`](../README.md#adding-a-new-app) and
[`../../DEPLOY.md`](../../DEPLOY.md#adding-a-new-app). High-level:

1. Pick a path prefix (`/<name>/`).
2. Add a `handle_path /<name>/* { ... }` block with
   `request_header -X-Forwarded-For` and `reverse_proxy <container>:<port>`.
3. Add the new network to [`../setup-droplet.sh`](../setup-droplet.sh) and
   to the caddy service's `networks:` list in [`docker-compose.yml`](./docker-compose.yml).
4. Create `deploy/<name>/docker-compose.yml` attaching the app's
   containers to `gateway_<name>`.

---

## Observing the gateway

```sh
# Live logs
docker compose -f /opt/apps/_gateway/docker-compose.yml logs -f caddy

# Check which networks caddy is attached to
docker inspect $(docker ps -qf name=caddy) --format '{{json .NetworkSettings.Networks}}'

# Inspect cert state (volume-backed, survives restarts)
docker exec $(docker ps -qf name=caddy) ls /data/caddy/certificates/
```
