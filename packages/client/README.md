# @cards/client

The web client for Emblem Cards. React 19 + Vite + Tailwind v4 + Zustand +
socket.io-client. Runs Local 2P and VS Computer entirely client-side;
Online mode talks to [`@cards/server`](../server) via socket.io.

---

## Run locally

```bash
# From repo root, one-time setup:
pnpm install
pnpm build                         # compile engine packages

# Dev:
pnpm --filter @cards/client dev    # Vite on http://localhost:5173
```

Local 2P and VS Computer work without a server running. For Online mode,
start [`@cards/server`](../server/README.md) in another terminal — the
client defaults to `http://localhost:3001` (override with `VITE_SERVER_URL`).

### Hot reload of workspace packages

Workspace packages (`@cards/shared`, `@cards/card-engine`,
`@cards/battle-engine`) export a `source` condition in their
`package.json` pointing at `src/index.ts`, and this client's
[`vite.config.ts`](./vite.config.ts) sets `resolve.conditions: ["source"]`.
As a result editing a card JSON file or engine source triggers HMR with
no intermediate `pnpm build`. Production builds still go through the
compiled `dist/` per `exports.default`.

---

## Production builds

```bash
pnpm --filter @cards/client build
```

Emits a static bundle into `dist/`. The three build-time env vars that
matter:

| Var | Dev default | Prod value (deployed) | Consumer |
| --- | --- | --- | --- |
| `VITE_BASE_PATH` | `/` | `/emblem/` | Vite's `base` — asset URLs in `index.html` line up with the gateway mount. |
| `VITE_SOCKET_PATH` | `/socket.io/` | `/emblem/socket.io/` | socket.io-client path option — matches the gateway `handle_path` rule. |
| `VITE_SERVER_URL` | `http://localhost:3001` | empty | Empty → client uses `window.location.origin` (TLS via the gateway). |

Set at build time via `build-args` to the Docker image (see
[`Dockerfile`](./Dockerfile) and the CI pipeline
[`deploy.yml`](../../.github/workflows/deploy.yml)). Missing any of them in
production is how the historic "blank images on prod" issue occurred — the
asset path defaulted to `/cards/...` which the gateway sent to the root
landing page, returning HTML with a 200.

---

## File map

| Folder | Purpose |
| --- | --- |
| [`src/pages/`](src/pages/) | Top-level screens: `Menu`, `DeckBuilder`, `Matchmaking`, `Battle`. Routed by the Zustand store's `screen` field — no router library. |
| [`src/components/`](src/components/) | Reusable UI: `CardView`, `CardInspector`, `HandView`, `FieldSlotView`, `GameLog`, `HowToPlay`, `BattleHints`, `CardArt`. |
| [`src/components/battle/`](src/components/battle/) | Battle-specific subcomponents: `EnergyBar`, `TurnBanner`, `FieldGrid`, `WinnerScreen`, `CombatFx`, `TurnTransitionOverlay`, `ActionHint`, `Toast`. |
| [`src/store/`](src/store/) | Zustand store + mode-agnostic actions + socket plumbing. See [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). |
| [`src/hooks/`](src/hooks/) | `useBattleSlotHandlers` (field click logic), `useWinSound`. |
| [`src/lib/`](src/lib/) | Small utilities: synth SFX via Web Audio, UUID identity in localStorage, random deck builder, color map, effect label formatter, tutorial flags. |
| [`public/cards/`](public/cards/) | Card art PNGs named `<card-id>.png`. See [`../../docs/ADDING_CARD_ART.md`](../../docs/ADDING_CARD_ART.md). |

---

## How state flows

1. Engine packages are pure data + functions.
2. The Zustand [`gameStore`](src/store/gameStore.ts) owns screen routing,
   mode, game state, and selection UI.
3. Battle UI calls `store.getActions().deploy(...)` — a mode-agnostic
   interface.
4. In local / AI mode, [`actions/local.ts`](src/store/actions/local.ts)
   invokes the engine directly, pushes events to the log, plays SFX,
   updates state.
5. In online mode, [`actions/online.ts`](src/store/actions/online.ts)
   emits a socket event; the server runs the engine authoritatively;
   [`socketListeners.ts`](src/store/socketListeners.ts) routes the
   resulting `game:update` back into the store.

No component ever branches on mode. The store handles that once, per
action type.

---

## Card art

See [`../../docs/ADDING_CARD_ART.md`](../../docs/ADDING_CARD_ART.md) for
the full story. TL;DR:

- Art lives at `public/cards/<card-id>.png`. No `art` field on cards, no
  manifest.
- [`CardArt.tsx`](src/components/CardArt.tsx) derives the URL via
  ``${import.meta.env.BASE_URL}cards/${card.id}.png`` so base paths work
  in both dev (`/`) and prod (`/emblem/`).
- If the file is missing, `onError` unmounts the `<img>` and the
  procedural SVG silhouette behind becomes visible. Dev mode logs a
  `console.debug`.
- `pnpm cards:check` fails the build if `public/cards/` contains a PNG
  whose id doesn't match a real card (catches typos and stale assets).
- Variants: default (hand) is `object-cover object-top` at 72 px; the
  inspector and winner screen pass `detailArt` for `object-contain` at
  144 px; field slots set `fill + fit="cover" + align="top"`.

---

## Vite config highlights

Beyond the usual React + Tailwind setup, [`vite.config.ts`](./vite.config.ts)
does two security-relevant things:

### `resolve.dedupe: ["react", "react-dom"]`

The root `package.json` depends on `react-native-safe-area-context` (for
the mobile package). That pulls its own React peer into the root
`node_modules`. Without dedupe, Zustand (also hoisted to the root)
resolves that copy while this client resolves its own, causing the
"invalid hook call" crash. Dedupe forces a single React instance.

### `resolve.conditions: ["source"]`

Workspace packages publish an `exports.source` condition pointing at
`src/index.ts`. Vite picks that up so edits propagate without a rebuild.

---

## Tech primer (short version)

- **Vite** — dev server + build tool. `pnpm dev` gives instant HMR;
  `pnpm build` emits `dist/`.
- **React 19** — functional components, no class components. Hooks for
  everything.
- **Tailwind v4** — utility-first CSS. All styling inline as
  `className="..."`. No separate `.css` files. A `clsx` helper is used
  for conditional / dynamic classes.
- **Zustand** — one store, no reducers. `useGameStore(s => s.field)`
  subscribes to just that slice.
- **Socket.IO** — WebSocket-based real-time. Event names and payload
  types are declared in [`@cards/shared`'s `protocol.ts`](../shared/src/protocol.ts).

Longer explanations: [root README § 2](../../README.md#2-tech-stack-explained).

---

## Deployment

Client ships as a Docker image (Caddy serving the Vite build) built from
[`Dockerfile`](./Dockerfile). Runs in the `emblem-web` container defined
by [`deploy/emblem/docker-compose.yml`](../../deploy/emblem/docker-compose.yml),
behind the shared Caddy gateway.

The image:
- Pins `caddy:2.8-alpine` as the runtime base and `node:22.11-slim` as
  the build base.
- Sets a `HEALTHCHECK` using busybox `wget --spider` (the full
  `--tries=...` flag is a GNU extension and **not** supported in
  busybox).
- Runs with `read_only: true` + tmpfs mounts for `/tmp`, `/config`,
  `/data` (Caddy's writable paths).

See [`deploy/emblem/README.md`](../../deploy/emblem/README.md) for the
compose details.

---

## Related reading

- [`../../README.md`](../../README.md) — monorepo overview, setup, game rules.
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — package responsibilities + data flow.
- [`../../docs/MAKING_CHANGES.md`](../../docs/MAKING_CHANGES.md) — recipes for common edits.
- [`../../docs/ADDING_CARD_ART.md`](../../docs/ADDING_CARD_ART.md) — card art convention.
- [`../../docs/SECURITY.md`](../../docs/SECURITY.md) — consolidated security controls.
- [`../mobile/README.md`](../mobile/README.md) — the RN port of this client.
