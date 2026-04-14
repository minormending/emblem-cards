# @cards/client

The web version of Emblem Cards. React + Vite + Tailwind + Zustand + socket.io-client.

## Run locally

```bash
# From repo root, one-time setup:
pnpm install
pnpm build    # compile the engine packages

# Then, in this package:
pnpm --filter @cards/client dev    # Vite on http://localhost:5173
```

Local 2P and VS Computer work without a server running. For Online mode, start [`@cards/server`](../server/README.md) in another terminal and the client will connect to `http://localhost:3001` by default (configurable via `VITE_SERVER_URL`).

## What lives here

| Folder | Purpose |
|---|---|
| [`src/pages/`](src/pages/) | Top-level screens: `Menu`, `DeckBuilder`, `Matchmaking`, `Battle`. Routed by the zustand store's `screen` field (no react-router). |
| [`src/components/`](src/components/) | Reusable UI: `CardView`, `CardInspector`, `HandView`, `FieldSlotView`, `GameLog`, `HowToPlay`, `BattleHints`, `CardArt`. |
| [`src/components/battle/`](src/components/battle/) | Battle-specific subcomponents: `EnergyBar`, `TurnBanner`, `FieldGrid`, `WinnerScreen`, `CombatFx`, `TurnTransitionOverlay`, `ActionHint`, `Toast`. |
| [`src/store/`](src/store/) | Zustand store + mode-agnostic actions + socket plumbing. See the architecture doc for the full breakdown. |
| [`src/hooks/`](src/hooks/) | `useBattleSlotHandlers` (field click logic), `useWinSound` (one-shot victory/defeat sfx). |
| [`src/lib/`](src/lib/) | Small utilities: synth SFX via Web Audio, UUID identity in localStorage, random deck builder, Tailwind color map, effect label formatter, tutorial flags. |
| [`public/cards/`](public/) | Optional card art dropped here. See [`docs/ADDING_CARD_ART.md`](../../docs/ADDING_CARD_ART.md). |

## How state flows

1. Engine packages (`card-engine`, `battle-engine`) are pure data + functions.
2. The zustand [`gameStore`](src/store/gameStore.ts) owns screen routing, mode, game state, and selection UI.
3. Battle UI calls `store.getActions().deploy(...)` — a mode-agnostic interface.
4. In local/AI mode, `actions/local.ts` invokes the engine directly, pushes events to the log, plays SFX, updates state.
5. In online mode, `actions/online.ts` emits a socket event; the server runs the engine authoritatively; `socketListeners.ts` routes the resulting `game:update` back into the store.

No component ever branches on mode. The store handles that once, per action type.

## Tech primer (the short version)

- **Vite** — dev server + build tool. `pnpm dev` gives instant HMR; `pnpm build` emits `dist/`.
- **React** — functional components, no class components. Hooks for everything (`useState`, `useEffect`, plus custom ones in `src/hooks/`).
- **Tailwind v4** — utility-first CSS. All styling inline as `className="..."`. No separate `.css` files to hunt through.
- **Zustand** — one store, no reducers, no Redux boilerplate. `useGameStore(s => s.field)` subscribes to just that slice.
- **Socket.IO** — WebSocket-based real-time. Event names and payload types are declared in [`@cards/shared`](../shared/README.md)'s [`protocol.ts`](../shared/src/protocol.ts).

Longer explanations for each of the above are in the [root README § 2](../../README.md#2-tech-stack-explained).

## Building for production

```bash
pnpm --filter @cards/client build
```

Emits a static bundle into `dist/`. Deploy it to any static host (Caddy, nginx, Vercel, Netlify) and point the server URL env var at a reachable socket.io endpoint.

## Related reading

- [`../../README.md`](../../README.md) — monorepo overview, setup, game rules
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — package responsibilities + data flow
- [`../../docs/MAKING_CHANGES.md`](../../docs/MAKING_CHANGES.md) — recipes for common edits
- [`../mobile/README.md`](../mobile/README.md) — the RN port of this client
