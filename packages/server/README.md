# @cards/server

Socket.IO server for Emblem Cards **online** mode. Node 22 + TypeScript, no
framework — just `http.createServer` + `socket.io`. The engine (pure TypeScript
from [`@cards/battle-engine`](../battle-engine)) runs here authoritatively;
clients send intents, never raw state.

Local 2P, Quick Start, and VS Computer don't touch this package. Only online
matches do.

---

## Run locally

```bash
# One-time, from repo root:
pnpm install
pnpm build

# Then:
pnpm --filter @cards/server dev    # tsx watch, PORT=3001
```

Override the port with `PORT=3002 pnpm dev`. The web client defaults to
`http://localhost:3001` so you don't need to configure anything for a
co-located dev pair.

Production binary:

```bash
pnpm --filter @cards/server build
node packages/server/dist/index.js
```

---

## File map

| File | Purpose |
| --- | --- |
| [`src/index.ts`](src/index.ts) | Entry point. Builds the HTTP server + Socket.IO, parses `CLIENT_ORIGIN`, installs per-IP connection cap, rate limiter, and per-event handlers. |
| [`src/GameRoom.ts`](src/GameRoom.ts) | Wraps one `GameState` + event log. Enforces turn ownership (server is authoritative). Produces per-player `GameView` projections. |
| [`src/matchmaking.ts`](src/matchmaking.ts) | FIFO queue. Pairs two players into a `GameRoom` and broadcasts `game:start`. |
| [`src/privateRooms.ts`](src/privateRooms.ts) | 4-char share codes for "play with a friend" rooms; 10-minute TTL. |
| [`src/sessions.ts`](src/sessions.ts) | `SessionStore`: `playerId` ↔ `socketId`. `validateAuth()` NFC-normalizes and regex-checks the payload. |
| [`src/validate.ts`](src/validate.ts) | Deck + field-position + hand-index validation. Resolves card ids through `@cards/card-engine` so clients can't forge stats. |
| [`src/rateLimit.ts`](src/rateLimit.ts) | Two-tier bucket limiter: per-socket (1 s / 30) and per-IP (60 s / 300). |
| [`src/logger.ts`](src/logger.ts) | `log.info` / `log.warn` / `log.error` with structured metadata. |

---

## Environment

| Var | Default | Notes |
| --- | --- | --- |
| `PORT` | `3001` | HTTP listen port. |
| `CLIENT_ORIGIN` | localhost dev origins | Comma-separated list of absolute http/https URLs. `undefined` uses dev defaults; empty string **throws** at startup (prevents silent misconfig). |

Accepted `CLIENT_ORIGIN` examples:

```
https://1-2-3-4.sslip.io
https://a.example.com,https://b.example.com
```

---

## Protocol

Event names and payload types are declared in
[`@cards/shared`'s `protocol.ts`](../shared/src/protocol.ts). Both server
and clients import from there, so adding an event is a one-place change.

### High-level flow

1. **`auth`** → `auth:ok` or `auth:error`. Required before anything else.
2. **`queue:join`** / **`queue:leave`** — public matchmaking.
3. **`room:create`** / **`room:join`** — private "share code" rooms.
4. Server emits **`game:start`** with each player's initial `GameView`.
5. Players emit **`game:deploy`** / **`game:attack`** / **`game:end-turn`**;
   server re-runs the engine and broadcasts **`game:update`** + a per-
   player **`game:action-result`**.
6. On win, **`game:over`** with match stats for the UI.
7. On disconnect, forfeit goes to the opponent; session + room are cleaned.

### Trust model

The server is authoritative. Clients emit *intent*
(`game:deploy hand=3 pos={row:"front", col:1}`), the server re-validates
and re-runs the engine, then tells both players what the new state is.

One intentional leak suppressed: opponent support-card passive bonuses
aren't sent in `GameView` (would reveal their deck). Attack previews on
the client slightly underestimate damage in online mode as a result; the
damage calculation itself runs server-side and is correct.

---

## Security controls

Most of these matter because the front door is a websocket exposed to the
public internet via the gateway.

### Identity

- **Trust-on-assertion.** Clients generate a UUID in localStorage
  ([`identity.ts`](../client/src/lib/identity.ts)) and send it as
  `playerId`. This is *intentional* — a casual card game, zero PII.
  Clearing localStorage regenerates the identity.
- **`playerId` shape enforced:** regex `^[A-Za-z0-9_-]{8,64}$`.
- **`displayName` shape enforced:** NFC-normalized, then
  `^[\p{L}\p{N} _.\-]{1,20}$`. Strips control chars / line breaks (log
  injection), blocks common impersonation glyphs (homoglyph, RTL overrides).

### Rate limiting + connection capping

Implemented at the socket.io layer so both polling and websocket
transports are covered.

| Scope | Window | Max events | Action on breach |
| --- | --- | --- | --- |
| Per-socket | 1 s | 30 | Disconnect the socket. |
| Per-IP | 60 s | 300 | Disconnect the current socket. Survives reconnects, so a client can't reset by dropping the connection. |
| Per-IP concurrent connections | live | 10 | Reject the handshake (middleware `next(new Error)`). |

The per-IP buckets **rely on real client IPs**. See next section.

### Real client IPs via `X-Forwarded-For`

In production this server sits behind the Caddy gateway. Without handling
XFF the server would see only the gateway's container IP and the per-IP
controls would be a no-op.

- The gateway **strips any incoming `X-Forwarded-For`** before setting
  its own (see
  [`deploy/gateway/Caddyfile`](../../deploy/gateway/Caddyfile)). A client
  can't inject their own header.
- The server's
  [`clientIp()` helper](src/index.ts) reads the first entry of
  `X-Forwarded-For` when present, else falls back to
  `socket.handshake.address` for dev / direct connections.

### CORS

`CLIENT_ORIGIN` is parsed at startup by `parseCorsOrigins()`:

- `undefined` → dev defaults (`http://localhost:5173-5175`).
- Comma-separated list of absolute http/https URLs → each validated with
  `new URL()`; invalid entries throw.
- `""` (set but empty) → throws, because a blanked prod env file must
  not silently fall back to localhost.

### Deck + action validation

Every action runs through [`validate.ts`](src/validate.ts) and
[`battle-engine`](../battle-engine) before mutating state.
`validateDeck()` resolves each card id through `getCardById()` from
`@cards/card-engine`; a client that forges stats gets the canonical card
back. Field positions and hand indices are type-guarded.

### Logs

- `playerId` is truncated to 8-char prefix in log lines (`shortId()`).
- `displayName` is sanitized before authentication so control chars can't
  corrupt log lines.
- JSON-file driver with 10 MB × 3 rotation on the droplet (see the
  [compose file](../../deploy/emblem/docker-compose.yml)).

### Container-level controls

Set in the [emblem compose file](../../deploy/emblem/docker-compose.yml):
`read_only: true`, `cap_drop: [ALL]`, `no-new-privileges`, CPU/memory
limits, non-root `USER node` from the Dockerfile.

See [`docs/SECURITY.md`](../../docs/SECURITY.md) for the whole-stack
summary.

---

## Health check

```
GET /healthz → 200 "ok"
```

Unauthenticated, no Socket.IO. Used by the container Dockerfile
`HEALTHCHECK` and by anything probing liveness from outside.

---

## Deploying

The server ships as a Docker image built from
[`Dockerfile`](Dockerfile) and pushed to GHCR by
[`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml). In
production it runs inside the `emblem-server` container defined by
[`deploy/emblem/docker-compose.yml`](../../deploy/emblem/docker-compose.yml),
behind the shared Caddy gateway.

- [`deploy/emblem/README.md`](../../deploy/emblem/README.md) — deploy
  compose details.
- [`deploy/gateway/README.md`](../../deploy/gateway/README.md) — routing
  and header handling.
- [`DEPLOY.md`](../../DEPLOY.md) — top-level deployment guide.

---

## Related reading

- [`../shared/src/protocol.ts`](../shared/src/protocol.ts) — full event list.
- [`../battle-engine/README.md`](../battle-engine/README.md) — what the engine actually does.
- [`../../docs/SECURITY.md`](../../docs/SECURITY.md) — consolidated security controls.
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — how the server fits into the overall system.
