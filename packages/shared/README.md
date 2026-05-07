# @cards/shared

The foundation of the monorepo. Only contains **types, constants, and tiny pure helpers** — no runtime dependencies. Every other package depends on this one.

## What lives here

| File | Purpose |
|---|---|
| [`types.ts`](src/types.ts) | The core domain: `Card`, `UnitCard`, `WeaponCard`, `ItemCard`, `SupportCard`, `TacticCard`, `Player`, `Field`, `GameState`, `Effect`, `GameView`, `AttackType`, `FieldPosition`, etc. |
| [`protocol.ts`](src/protocol.ts) | Socket.IO event signatures — `ClientToServerEvents` and `ServerToClientEvents`. Changing these is a protocol change that affects client, mobile, and server simultaneously. |
| [`constants.ts`](src/constants.ts) | Game balance numbers: `DECK_SIZE`, `MAX_CARD_COPIES`, `STARTING_HAND_SIZE`, `MAX_ENERGY`, `TRIANGLE_BONUS`, AI pacing, toast duration, and more. If you find yourself hardcoding a knob-like number elsewhere, move it here. |
| [`errors.ts`](src/errors.ts) | `ErrorCode` enum, `GameError` shape, and the `Result<T>` type used across every engine action. Factory helpers `ok()`, `err()`, `isErr()`, and `formatError()` for display. |
| [`events.ts`](src/events.ts) | `GameEvent` discriminated union (one variant per mutation kind: `unit_deployed`, `unit_damaged`, `unit_ko`, `turn_ended`, `game_won`, …) and `formatEvent()` for human-readable rendering. |
| [`clone.ts`](src/clone.ts) | `cloneCard()` — deep clone so decks don't share mutable state across instances. |

## Rule of thumb

**Don't add logic here.** If it needs to compute something beyond a trivial one-liner, it belongs in [`@cards/card-engine`](../card-engine/README.md) or [`@cards/battle-engine`](../battle-engine/README.md).

## Build

```bash
pnpm --filter @cards/shared build
```

Or `pnpm build` from the repo root to rebuild all packages in dependency order.

## Workspace `exports`

`package.json` has an `exports.source` condition pointing at `src/index.ts`
so consumers that opt in via Vite's `resolve.conditions: ["source"]` (the
client does) pick up source directly. Everyone else (Node, vitest) falls
through to the compiled `dist/index.js` via `exports.default`. This keeps
HMR working in the client without forcing a rebuild after every edit to a
shared type.

## Who depends on this

Everyone: `card-engine`, `battle-engine`, `server`, `client`, `mobile`.
A breaking change here (like renaming a field on `UnitCard`) needs a
coordinated update across all of them. TypeScript's compiler catches most
of it; the rest falls out when tests or Metro fail.

## Related reading

- [`../card-engine/README.md`](../card-engine/README.md) — card data + damage formula.
- [`../battle-engine/README.md`](../battle-engine/README.md) — game state machine.
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — how the pieces fit.
