# Security

Consolidated list of security controls across the Emblem Cards stack. Each
entry points at the file (or workflow step) that implements it so you can
verify at a glance.

The threat model is a **casual multiplayer card game**. Identity is
trust-on-assertion (a client-generated UUID in localStorage — see the
[identity.ts](../packages/client/src/lib/identity.ts) comment). No money, no
PII, no passwords. That rules out accountability but simplifies a lot. The
controls below aim to make casual abuse (DoS, impersonation, XSS pivot)
expensive, and to keep a compromise of any one layer from cascading.

> **Layered entry points:**
> - [`../DEPLOY.md`](../DEPLOY.md) — production deploy
> - [`../deploy/README.md`](../deploy/README.md) — deploy directory map
> - [`../deploy/gateway/README.md`](../deploy/gateway/README.md) — TLS + routing
> - [`../deploy/emblem/README.md`](../deploy/emblem/README.md) — app compose
> - [`../packages/server/README.md`](../packages/server/README.md) — runtime game server

---

## 1. Network / host

| Control | Where | Why |
| --- | --- | --- |
| UFW allows only `22/80/443` inbound | [`deploy/setup-droplet.sh`](../deploy/setup-droplet.sh) | Every other port is dropped at the host firewall; app containers can't accidentally expose themselves. |
| Key-only SSH, root login disabled, passwords disabled | `setup-droplet.sh` | No credential-stuffing window; lost key is the only way in. |
| `fail2ban` on sshd | `setup-droplet.sh` | Auto-bans repeat probe sources. |
| `unattended-upgrades` | `setup-droplet.sh` | Security patches ship without manual intervention. |
| Non-root `deploy` user for ops | `setup-droplet.sh` | GitHub Actions pushes via this user, not root. |

## 2. TLS / gateway

| Control | Where | Why |
| --- | --- | --- |
| Auto-provisioned Let's Encrypt cert | [`deploy/gateway/Caddyfile`](../deploy/gateway/Caddyfile) | No manual cert rotation. Single public TLS endpoint for every app on the droplet. |
| HSTS with `preload` | `Caddyfile` | 1-year HSTS; `preload` keeps the door open for listing a real domain later. |
| Content-Security-Policy | `Caddyfile` | `default-src 'self'` locks scripts / network / styles to same-origin. `'unsafe-inline'` for style is Tailwind-only; everything else is strict. |
| `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | `Caddyfile` | Defense-in-depth headers for common browser misbehaviors. |
| `Server` banner removed | `Caddyfile` | No free reconnaissance. |
| Caddy admin API disabled (`admin off`) | `Caddyfile` | A container co-tenant on the same docker network can't reload the config or read TLS state through `:2019`. |
| Incoming `X-Forwarded-For` stripped before proxy | `Caddyfile` `handle_path` blocks | Without the strip, `reverse_proxy` *appends* to any client-supplied XFF; a malicious client could inject `X-Forwarded-For: 1.2.3.4` and bypass per-IP rate limits. |

## 3. Network isolation between apps

| Control | Where | Why |
| --- | --- | --- |
| Per-app docker networks | `deploy/setup-droplet.sh`, each app's `docker-compose.yml` | The gateway is the only container attached to more than one app's network. `dcc-web` can't reach `emblem-server`. |
| No host-port binding for app containers | each app's `docker-compose.yml` | Public ingress is only Caddy's `:80` / `:443`. |

## 4. Container hardening

| Control | Where | Why |
| --- | --- | --- |
| `cap_drop: [ALL]` on every service | every compose file | Root inside the container has no Linux capabilities by default. |
| `cap_add: [NET_BIND_SERVICE]` on Caddy services | gateway + emblem-web compose | Only what's needed to bind `:80` / `:443`. |
| `security_opt: no-new-privileges:true` | every service | setuid binaries can't gain privs. |
| `read_only: true` with explicit `tmpfs:` | every service where feasible | A compromise can't modify the image layers or persist state. |
| Resource limits (CPU + memory) | every service | Bound blast radius of a misbehaving container. |
| Pinned base images (`node:22.11-slim`, `caddy:2.8-alpine`) | Dockerfiles + gateway compose | No surprise `:latest` pulls. |
| Server runs as `USER node` | [`packages/server/Dockerfile`](../packages/server/Dockerfile) | Non-root inside the container. |
| Image vulnerability scan in CI | [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Trivy fails the deploy on fixable HIGH / CRITICAL CVEs; SARIF uploaded to the Security tab. |

## 5. CI/CD

| Control | Where | Why |
| --- | --- | --- |
| Images built in GitHub-hosted runners and pushed to GHCR | `deploy.yml` `build-push` job | No local-machine build-context leakage. |
| `IMAGE_TAG` pinned to git SHA (no `:latest` fallback) | emblem compose | Rollbacks are deterministic; accidental empty env fails loudly via `${IMAGE_TAG:?...}`. |
| Docker login uses a per-run `DOCKER_CONFIG=$(mktemp -d)` + `trap` cleanup | `deploy.yml` SSH script | A failure mid-deploy can't leave the GHCR token in `~/.docker/config.json`. |
| `.dockerignore` excludes `**/.env*` but keeps `.env.example` | [`.dockerignore`](../.dockerignore) | Accidental env files stay out of build contexts and image layers. |
| `.env` files written `chmod 600` | `deploy.yml` SSH script | Readable only by the deploy user. |

## 6. Application layer

### Connection / transport

| Control | Where | Why |
| --- | --- | --- |
| Socket.IO CORS restricted to `CLIENT_ORIGIN` | [`packages/server/src/index.ts`](../packages/server/src/index.ts) `parseCorsOrigins()` | Entries validated as absolute http/https URLs at startup; `undefined` falls back to dev defaults, `""` throws. |
| Real client IP via `X-Forwarded-For` | `clientIp()` helper in `index.ts` | Works correctly behind the gateway (which scrubs incoming XFF), falls back to socket address in dev. |
| Per-IP concurrent-connection cap | `index.ts` | Rejects the handshake past 10 sockets per IP. Bounds memory + FD exhaustion from connect-loops. |
| Per-socket + per-IP rate limits | [`packages/server/src/rateLimit.ts`](../packages/server/src/rateLimit.ts) | Socket bucket (1 s / 30 events) catches bursts; IP bucket (60 s / 300 events) survives reconnects so a client can't reset by dropping the socket. |

### Auth / session

| Control | Where | Why |
| --- | --- | --- |
| `playerId` regex `^[A-Za-z0-9_-]{8,64}$` | [`packages/server/src/sessions.ts`](../packages/server/src/sessions.ts) | Bounded, log-safe, path-safe. |
| `displayName` NFC-normalized + `^[\p{L}\p{N} _.\-]{1,20}$` | `sessions.ts` | Strips control chars / line breaks that could corrupt logs, and unicode RTL / homoglyph tricks used for impersonation. |
| Single-session per `playerId` | `sessions.ts` `SessionStore.authenticate()` | A new auth on the same `playerId` kicks the old socket with `auth:error`. |

### Card data

| Control | Where | Why |
| --- | --- | --- |
| Card id regex `^[a-z0-9-]+$` | [`packages/card-engine/src/cards/schema.ts`](../packages/card-engine/src/cards/schema.ts) | IDs feed into derived asset URLs (`/cards/<id>.png`); the regex forbids dots, slashes, and whitespace so nothing can escape the intended path. |
| Art-file validation | [`packages/card-engine/scripts/check-cards.ts`](../packages/card-engine/scripts/check-cards.ts) | `pnpm cards:check` verifies every PNG under `public/cards/` maps to a real card id. Catches renames / typos at build time. |
| Server trusts card ids only, not client-sent stats | [`packages/server/src/validate.ts`](../packages/server/src/validate.ts) | `validateDeck()` resolves ids through `getCardById()`. A client forging stats gets the canonical card back. |

### Game rules

| Control | Where | Why |
| --- | --- | --- |
| Authoritative engine on the server | [`packages/battle-engine`](../packages/battle-engine) + server GameRoom | Clients emit intent, server re-runs the engine. A client can't cheat because the server never accepts raw state. |
| Deck size + copy limits + Lord count | `server/validate.ts` | Basic structural integrity for deck submissions. |
| `GameView` sanitization per player | server GameRoom | Opponent's deck composition and support bonuses aren't leaked in the projection. |

### Client hardening

| Control | Where | Why |
| --- | --- | --- |
| Asset paths use `import.meta.env.BASE_URL` | [`packages/client/src/components/CardArt.tsx`](../packages/client/src/components/CardArt.tsx) | `/cards/<id>.png` resolves correctly under `/emblem/` in prod and `/` in dev. |
| Card art errors fall back to the procedural SVG | same file | A broken / missing PNG reveals the silhouette instead of an HTML dump from the gateway landing page (which was the exact bug that produced the "blank images on prod" issue). |
| Single React instance enforced via Vite `dedupe` | [`packages/client/vite.config.ts`](../packages/client/vite.config.ts) | Root-hoisted `react-native-safe-area-context` pulled a second React copy; dedupe prevents the invalid-hook-call that resulted. |

## 7. Logging and observability

| Control | Where | Why |
| --- | --- | --- |
| JSON-file log driver, 10 MB × 3 rotated | every compose file | Bounded disk usage on the droplet. |
| `shortId()` truncation of `playerId` in logs | `packages/server/src/index.ts` | Avoids echoing the full identity across log lines. |
| Structured log lines (`tag: message`, `{metadata}`) | `packages/server/src/logger.ts` | Easier to grep / ship without ad-hoc parsing. |

---

## Intentional non-goals

- **Accountable identity.** Clearing localStorage regenerates `playerId`.
  This is the trade-off for zero PII storage.
- **End-to-end encryption between players.** Redundant with TLS to the
  server and an authoritative server engine.
- **Per-player bandwidth caps.** The socket + IP rate limits plus Docker
  resource caps are sufficient for the threat model.
- **Aggregate deck power cap.** Cost + stat sum ceilings were considered
  but deferred; current validation (deck size, max copies, Lord count) is
  enough for the casual game scope.

## Where to look first when something's off

- Login spam / DoS → `docker logs -f emblem-server` (rate-limit disconnect lines).
- Cert issues → `docker logs -f caddy` (look for ACME challenge errors).
- CSP blocks → browser devtools console; CSP errors usually point at
  `Caddyfile` tightening needed.
- Unauthorized containers → `docker network inspect gateway_emblem` should
  show only caddy, emblem-server, emblem-web.
