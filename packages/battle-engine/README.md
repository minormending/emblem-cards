# @cards/battle-engine

The game state machine. Takes a `GameState` and an action (deploy, attack, end turn), mutates the state, and returns a `Result<GameEvent[]>` describing exactly what happened.

## What lives here

| File | Purpose |
|---|---|
| [`game.ts`](src/game.ts) | Turn flow: `createGame`, `drawPhase`, `attackAction`, `endTurn`, `previewCombat`, `canAttack`. The top-level surface most consumers use. |
| [`deploy.ts`](src/deploy.ts) | `deployCard()` — dispatches to per-card-type handlers (`deployUnit`, `deployWeapon`, `deployItem`, `deploySupport`, `deployTactic`). |
| [`effects.ts`](src/effects.ts) | `resolveEffects()` — fires effects attached to items and tactics (healing, damage, buffs, reposition, draw). Returns the resulting events. |
| [`players.ts`](src/players.ts) | `currentPlayer()` / `opposingPlayer()` — tiny helpers to avoid `state.players[state.currentPlayerIndex]` boilerplate. |
| [`field.ts`](src/field.ts) | Field primitives: `placeUnit`, `removeUnit`, `equipWeapon`, `getSlot`, `canReach`, `canEquip`, `getOccupiedPositions`, `getAdjacentPositions`. Pure geometry + slot manipulation. |
| [`win.ts`](src/win.ts) | `checkWinCondition()` — Lord KO'd, out of units, or deck-out. |
| [`ai/evaluate.ts`](src/ai/evaluate.ts) | The AI's scoring pass. Every action gets a numeric score and a **reasoning breakdown** (array of `{ label, delta }`) so you can debug why the AI chose what it chose. |
| [`ai/aiPlayer.ts`](src/ai/aiPlayer.ts) | `pickBestAction()` and `explainAction()` — drive the AI one move at a time. |
| [`__tests__/`](src/__tests__/) | Vitest suites covering every action: deploy, combat, counter-attacks, KOs, effects, supports, events, win conditions, mutation safety. |

## Key patterns

**Everything that mutates returns `Result<GameEvent[]>`.** A successful deploy returns `ok([{ kind: "unit_deployed", ... }, { kind: "cards_drawn", ... }])`. A failed one returns `err({ code: "NOT_YOUR_TURN", ... })`. The UI (client/mobile) and the server both consume these events identically — the battle log, toasts, sound effects, and server broadcasts all branch on `event.kind`, never on some ad-hoc return shape.

**Invariant: mutation is local.** Actions mutate only the passed-in `GameState`. There are no module-level variables, no background timers, no side effects. This is why the same engine runs inside the server (authoritative), the client local/AI mode, and the mobile client — all from one compiled package.

## Testing

```bash
pnpm --filter @cards/battle-engine test
```

Tests are the most authoritative documentation for the game rules. Start with [`game.test.ts`](src/__tests__/game.test.ts) and [`combat.test.ts`](src/__tests__/combat.test.ts).

## Workspace `exports`

`package.json` has an `exports.source` condition → `src/index.ts` so
Vite resolves source directly for HMR. Node and vitest fall back to the
compiled `dist/` via `exports.default`. See
[`../shared/README.md`](../shared/README.md#workspace-exports) for the
same pattern applied repo-wide.

## Who depends on this

- `server` — runs the authoritative game loop for online matches.
- `client` — runs it client-side for Local 2P and AI modes.
- `mobile` — same as client, running natively on Android.

## Related reading

- [`../card-engine/README.md`](../card-engine/README.md) — card data + damage formula.
- [`../shared/README.md`](../shared/README.md) — types, protocol, events.
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — system-level overview.
