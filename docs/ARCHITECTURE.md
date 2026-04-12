# Architecture

A bird's-eye view of how the code is organized. Read this first before
making changes — it will save you time hunting through files.

## The big picture

```
┌─────────────────────────────────────────┐
│              @cards/client              │  React UI, Zustand store
│  (browser: menu, deck builder, battle)  │  socket.io-client
└───────────────┬─────────────────────────┘
                │                ▲
                │ socket events  │ state updates (pure)
                ▼                │
┌─────────────────────────────────────────┐
│             @cards/server               │  Node + Socket.IO
│  (matchmaking, GameRoom per match)      │
└───────────────┬─────────────────────────┘
                │
                │ imports game logic
                ▼
┌─────────────────────────────────────────┐
│         @cards/battle-engine            │  Pure TypeScript
│  (createGame, deployCard, attackAction, │  No I/O, no React, no sockets
│   endTurn, checkWinCondition, AI...)    │  Actions return GameEvent[]
└───────────────┬─────────────────────────┘
                │
                │ calculateDamage, cards data
                ▼
┌─────────────────────────────────────────┐
│          @cards/card-engine             │  Pure TypeScript
│  (damage formula, triangle rules,       │
│   all card data — units, weapons, etc.) │
└───────────────┬─────────────────────────┘
                │
                │ types, constants, Result, events, clone
                ▼
┌─────────────────────────────────────────┐
│            @cards/shared                │  Types + constants ONLY
│                                         │  (no runtime deps)
└─────────────────────────────────────────┘
```

Lower packages know nothing about higher ones. This is important:

- **Rule: engines never import from client or server.**
- The engines are pure so we can unit-test them in isolation and so the
  server and client can both import them and run the same logic.

## Package responsibilities

### @cards/shared

Types, constants, and tiny helpers with no runtime dependencies:

| File | Purpose |
|------|---------|
| `types.ts` | `Card`, `UnitCard`, `Player`, `Field`, `GameState`, `Effect` |
| `protocol.ts` | Socket.IO event signatures (`ClientToServerEvents`, etc.) |
| `constants.ts` | Game balance numbers (`DECK_SIZE`, `MAX_ENERGY`, etc.) |
| `errors.ts` | `ErrorCode` enum, `GameError`, `Result<T>`, `ok()`/`err()`/`isErr()` |
| `events.ts` | `GameEvent` discriminated union, `formatEvent()` |
| `clone.ts` | `cloneCard()` deep clone helper |

**Don't add logic here.** If it needs to compute something, it belongs in one
of the engine packages.

### @cards/card-engine

Card data and pure per-card functions:

| File | Purpose |
|------|---------|
| `cards/*.ts` | Every card definition (units, weapons, items, supports, tactics) |
| `cards/validate.ts` | Fail-fast validation of card data at module load |
| `damage.ts` | `calculateDamage()` — the STR/MAG vs DEF/RES formula |
| `triangles.ts` | Weapon-triangle and magic-triangle lookups |

No state. No mutation. Give it two cards, get a number back.

### @cards/battle-engine

Mutable game state transitions:

| File | Purpose |
|------|---------|
| `players.ts` | `currentPlayer` / `opposingPlayer` lookups |
| `field.ts` | Field primitives (`placeUnit`, `canReach`, `canEquip`, ...) |
| `game.ts` | Turn flow (`createGame`, `drawPhase`, `attackAction`, `endTurn`) |
| `deploy.ts` | `deployCard` with per-card-type handlers (`deployUnit`, `deployWeapon`, ...) |
| `effects.ts` | `resolveEffects()` — fires item/tactic effects, returns events |
| `win.ts` | `checkWinCondition()` |
| `ai/evaluate.ts` | AI scoring — every action has a reasoning breakdown |
| `ai/aiPlayer.ts` | `executeAITurn()` — runs AI turn to completion |

Every mutating action returns `Result<GameEvent[]>`. The return type describes
**what happened**, not just whether it succeeded.

### @cards/server

Node + Socket.IO. Maintains one `GameRoom` per active match:

| File | Purpose |
|------|---------|
| `index.ts` | Socket event handlers, matchmaking orchestration |
| `GameRoom.ts` | Wraps a `GameState`, enforces turn ownership, returns `Result<GameEvent[]>` |
| `sessions.ts` | Tracks player sessions (playerId ↔ socketId) |
| `matchmaking.ts` | FIFO queue, pairs two players into a new room |
| `validate.ts` | Server-side input sanitization (decks, positions, indices) |
| `logger.ts` | Structured logger (`log.info`, `log.warn`, `log.error`) |

The server trusts nothing from the client. Every action is revalidated.

### @cards/client

React app. Single Zustand store with separate action modules:

| File | Purpose |
|------|---------|
| `store/gameStore.ts` | Zustand store — state + lifecycle (`quickStart`, `startLocalBattle`, etc.) |
| `store/actions/types.ts` | `GameActions` interface (mode-agnostic surface) |
| `store/actions/local.ts` | Local/AI mode — runs the engine, plays sfx, writes log |
| `store/actions/online.ts` | Online mode — emits socket events |
| `store/selectors.ts` | `getCurrentPlayer`, `getOpponentInfo`, `getIsMyTurn`, etc. |
| `store/aiTurn.ts` | `scheduleAITurn()` — runs the AI opponent's turn |
| `store/logStore.ts` | Battle log — maps engine events to human-readable entries |
| `store/socket.ts` | Singleton socket.io client |
| `store/socketListeners.ts` | Server → client event handlers |
| `pages/` | Top-level screens (Menu, DeckBuilder, Matchmaking, Battle) |
| `components/battle/` | Focused battle-UI components (EnergyBar, TurnBanner, FieldGrid, ...) |
| `components/` | Shared UI (CardView, CardInspector, GameLog, HandView, ...) |
| `hooks/` | Custom hooks (`useBattleSlotHandlers`, `useWinSound`) |
| `lib/` | Small pure utilities (sounds, identity, deckBuilder, effect labels) |

Battle pages call `store.getActions().deploy(...)` — no mode branching in the UI.

## Key patterns

### `Result<T>` everywhere

Engine actions never throw for expected failures. They return:

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: GameError }
```

Callers narrow with `isErr(r)` or `r.ok`:

```typescript
const result = deployCard(state, handIndex, target);
if (isErr(result)) {
  showMessage(formatError(result.error));
  return;
}
const events = result.value;
```

Every error has a stable `code` (e.g., `ErrorCode.TOME_ON_WARRIOR`) so programmatic
logic can branch on it. Human-readable messages come from `DEFAULT_ERROR_MESSAGES`
and are rendered via `formatError()`.

### Events describe what happened

Every mutating engine function returns a list of `GameEvent`s. Each event is a
discriminated-union variant describing one discrete thing that happened:

```typescript
{ kind: "unit_deployed", position, unit }
{ kind: "unit_damaged", position, amount, hpAfter, source }
{ kind: "unit_ko", position, unit }
{ kind: "game_won", winner, reason: "lord_ko" }
{ kind: "turn_ended", endingPlayer, nextPlayer, turnNumber }
// ...14 total variants
```

Consumers don't diff state — they walk the event list:

```typescript
const events = value(attackAction(state, from, to));
if (events.some(e => e.kind === "unit_ko")) sfx.ko();
```

The client's `logStore` has an `addFromEvents()` method that turns the event
stream into battle log entries automatically via `formatEvent()`.

### Mode-agnostic UI actions

The client exposes a single `GameActions` interface:

```typescript
interface GameActions {
  deploy(handIndex, target): void;
  attack(from, to): void;
  endTurn(): void;
}
```

`store.getActions()` returns the right implementation based on `mode`:
- `createLocalActions(store)` runs the engine in-process (local, AI)
- `createOnlineActions(store)` emits socket events (online)

Battle components never branch on mode — they just call `actions.deploy(...)`.

## Data flow examples

### Local game — you click "Deploy Marth to front-0"

```
Click slot → useBattleSlotHandlers.handleOwnSlotClick()
           → store.getActions().deploy(handIndex, pos)
           → (local.ts) deployCard(state, handIndex, pos)
           → returns Result<GameEvent[]>
           → on success:
             - sfx.deploy()
             - useLogStore.addFromEvents(events)
             - store.setState({ gameState: { ...state } })
           → React re-renders
```

### Online game — you attack an enemy unit

```
Click enemy → useBattleSlotHandlers.handleEnemySlotClick()
            → store.getActions().attack(from, to)
            → (online.ts) socket.emit("game:attack", from, to)
            ─── network ───►
            server: requireAuth() → validate positions
            → GameRoom.attack(playerId, from, to)
            → battle-engine.attackAction(state, from, to)
            → returns Result<GameEvent[]>
            → broadcastGameUpdate(room)  // full view snapshot
            ◄─── network ───
            socketListeners → store.setState({ gameView: view })
            → React re-renders
```

### AI turn

```
End Turn → store.getActions().endTurn()
         → (local.ts) endTurn(state) returns GameEvent[]
         → useLogStore.addFromEvents(events)
         → store.setState(...)
         → scheduleAITurn(store) — setTimeout(AI_TURN_DELAY_MS)
           → executeAITurn(state) returns { actions, events }
           → useLogStore.addFromEvents(events)
           → console.debug AI reasoning breakdowns
           → endTurn(state) + drawPhase(state)
           → store.setState(...)
```

## Key invariants

1. **Cards in card-engine are read-only templates.** `cloneCard()` runs on
   deck-build and `placeUnit()` runs on deploy, so every instance has its own
   mutable stats/effects.

2. **Engine packages never import from client or server.** If you feel the
   urge, something is wrong with the design.

3. **Every error is a typed code.** No `new Error("...")` in engine or server
   action paths. Use `err(ErrorCode.XYZ)` and let callers inspect `.code`.

4. **Every mutation returns events.** Don't diff state to figure out what
   changed; read the returned `GameEvent[]`.

5. **Balance numbers live in `shared/constants.ts`.** Don't hardcode magic
   numbers in multiple files.

6. **The server is the source of truth in online mode.** The client can run
   local simulations but must always accept the server's `game:update`.

7. **`requireAuth()` gates every server action.** The identity is a
   client-generated UUID in localStorage. No passwords.

## Where tests live

Each concern has its own test file:

| File | Focus |
|------|-------|
| `game.test.ts` | Game creation, draw phase, turn flow |
| `deploy.test.ts` | Deploying each card type, target validation |
| `combat.test.ts` | Attack resolution, targeting, range, KO → win |
| `effects.test.ts` | Healing caps, buff caps |
| `weapons.test.ts` | Compatibility rules, re-equip discard |
| `supports.test.ts` | Support dedup and pair activation |
| `win.test.ts` | `checkWinCondition()` in isolation |
| `mutation-safety.test.ts` | Card-template isolation guarantees |
| `events.test.ts` | Asserting on emitted GameEvents |
| `helpers.ts` | Shared factories (`makeUnit`, `buildDeck`, `value`, `errCode`) |

Run `pnpm turbo test` from the root to run everything.
