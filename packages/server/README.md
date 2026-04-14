# @cards/server

The Socket.IO server that powers **Online** mode. Node + TypeScript, no framework — just `http` + Socket.IO.

Only needed when players want to match online. Local 2P, Quick Start, and VS Computer don't touch it.

## Run locally

```bash
# One-time, from repo root:
pnpm install
pnpm build

# Then:
pnpm --filter @cards/server dev
```

Server listens on port **3001** by default (`PORT=3002 pnpm dev` to override). The client defaults to `http://localhost:3001`, so if you're running both locally you don't need to configure anything.

## What lives here

| File | Purpose |
|---|---|
| [`src/index.ts`](src/index.ts) | Entry point. Sets up the socket server and wires event handlers to matchmaking + game rooms. |
| [`src/GameRoom.ts`](src/GameRoom.ts) | Wraps one `GameState`. Enforces turn ownership (server is authoritative — client moves are revalidated). Broadcasts `game:update` to both players after every action. |
| [`src/matchmaking.ts`](src/matchmaking.ts) | FIFO queue. Two players in → one `GameRoom` out. Broadcasts `game:start` with initial views. |
| [`src/sessions.ts`](src/sessions.ts) | Tracks `playerId` ↔ `socketId` so reconnects are at least identifiable. |
| [`src/validate.ts`](src/validate.ts) | Strict input sanitization for decks, positions, and hand indices. The server trusts nothing from clients. |
| [`src/logger.ts`](src/logger.ts) | Structured logger — `log.info`, `log.warn`, `log.error` with tag prefixes. |

## Protocol

Event names and payload types are declared in [`@cards/shared`'s `protocol.ts`](../shared/src/protocol.ts). Both server and clients import from there, so adding an event is a one-place change.

The server-side contract in one paragraph: players authenticate (`auth`), join the queue (`queue:join`), receive a `game:start` with their player view, then emit `game:deploy` / `game:attack` / `game:end-turn`. The server re-runs those actions through `@cards/battle-engine` and broadcasts `game:update` with the new views. Errors come back as `game:error`. Clients never run the authoritative engine for online mode — they only render the view the server hands them.

## Trust model

**The server is authoritative.** Clients emit intent (`game:deploy hand=3 pos={row:"front", col:1}`), the server re-validates and re-runs the engine, then tells both players what the new state is. A malicious client can't cheat because the server never accepts raw state from them.

The one concession: support card passive bonuses for the **opponent** aren't sent in the `GameView` (to avoid leaking their deck composition). This means the attack-preview UI slightly underestimates damage in online mode, but the damage calculation itself is authoritative on the server.

## Deployment

Plain Node process:

```bash
pnpm --filter @cards/server build
node packages/server/dist/index.js
```

Put a reverse proxy (Caddy, nginx) in front if you want TLS, which you do — clients on mobile will refuse `ws://` on newer Android versions unless you also flip the cleartext-traffic opt-in (don't; configure TLS).

## Related reading

- [`../shared/src/protocol.ts`](../shared/src/protocol.ts) — full event list
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — how the server fits into the overall system
- [`../../DEPLOY.md`](../../DEPLOY.md) — deployment specifics (if present)
