# Making Changes — Common Recipes

Step-by-step guides for the changes you'll most often want to make. Keep
[ARCHITECTURE.md](./ARCHITECTURE.md) handy — it shows where each file lives.

## Run the game

```bash
pnpm install          # first time
pnpm turbo build      # compile everything
pnpm turbo test       # run all engine tests

# In two terminals:
cd packages/server && pnpm dev       # Socket.IO server on :3001
cd packages/client && pnpm dev       # Vite dev server on :5173
```

After any change, run `pnpm turbo test` to make sure nothing broke.

---

## Tweak game balance (HP, energy, damage...)

Almost all numbers live in **one file**:

**`packages/shared/src/constants.ts`**

| Constant | What it controls |
|----------|------------------|
| `DECK_SIZE` | Cards required per deck |
| `MAX_CARD_COPIES` | Max duplicates of a card in a deck |
| `STARTING_HAND_SIZE` | Cards drawn at game start |
| `MAX_ENERGY` | Cap on maxEnergy growth |
| `STARTING_ENERGY` | Energy on turn 1 |
| `TRIANGLE_BONUS` | ATK added by weapon-triangle advantage |
| `MIN_DAMAGE` | Floor on damage after STR-DEF |
| `AI_MAX_ACTIONS_PER_TURN` | Safety cap on AI turn length |
| `AI_TURN_DELAY_MS` | Pause before AI starts thinking |
| `MESSAGE_DURATION_MS` | How long toast messages show |

If you're hardcoding a number that feels like a knob, put it here first.

---

## Add a new unit card

1. Open `packages/card-engine/src/cards/units.ts`.
2. Append a new object to the `units` array:

   ```typescript
   {
     type: "unit",
     id: "cavalier-seth",          // unique, lowercase-hyphens
     name: "Seth",                  // display name
     class: "Cavalier",             // used by support cards for pairs
     attackType: "lance",           // sword/axe/lance/bow/fire/wind/thunder
     maxHp: 24,                     // MUST equal stats.hp
     stats: { hp: 24, str: 11, mag: 0, def: 8, res: 4, spd: 9 },
     tags: ["mounted"],             // infantry/mounted/armored/flying
     effects: [],                   // optional: add special abilities
     cost: 3,                       // Energy cost to deploy
     isLord: false,                 // true if this is a Lord card
     flavor: "The Silver Knight.",   // optional flavor text
   }
   ```

3. Run `pnpm turbo build`. The deck builder auto-picks up the new card.

**Validation is automatic.** `validateCardData()` in `cards/index.ts` runs at
module load and crashes on bad data — e.g. `maxHp !== stats.hp`, missing class,
negative stats, duplicate ID. No more silent misbehavior at runtime.

---

## Add a new effect type

Effects are a discriminated union in `types.ts`. Adding one has four steps:

1. **Declare it** in `packages/shared/src/types.ts`, in the `Effect` union:

   ```typescript
   | { kind: "pierce_defense"; percentage: number }
   ```

2. **Handle it at the right time.** Depending on when it fires:

   | When | File to edit |
   |------|-------------|
   | Damage calc | `packages/card-engine/src/damage.ts` |
   | On deploy (unit only) | `packages/battle-engine/src/deploy.ts` `deployUnit` |
   | From an item/tactic | `packages/battle-engine/src/effects.ts` `applyEffect` switch |
   | End of turn | `packages/battle-engine/src/game.ts` `applyUnitHealAuras` or `applySupportHeals` |
   | Passive reach (like `ranged`) | `packages/battle-engine/src/game.ts` `attackAction` |

   **If the effect mutates state, emit a `GameEvent` for it** (see next recipe).

3. **Show it in the UI.** Add a case to `effectLabel()` in
   `packages/client/src/lib/effects.ts` so cards display it.

4. **Test it.** Add a test in the appropriate `__tests__` file that asserts
   on the emitted events (not just on the state).

---

## Add a new GameEvent kind

Events are the engine's way of saying "here's exactly what I did." Any new
mutation should emit a descriptive event.

1. **Declare it** in `packages/shared/src/events.ts`, in the `GameEvent` union:

   ```typescript
   | { kind: "unit_stunned"; position: FieldPosition; turns: number }
   ```

2. **Add a human-readable message** in `formatEvent()`:

   ```typescript
   case "unit_stunned":
     return `stunned for ${event.turns} turn(s)`;
   ```

3. **Emit it** from the engine function that causes it:

   ```typescript
   events.push({ kind: "unit_stunned", position: target, turns: 2 });
   ```

4. **Map it to a log entry** in `packages/client/src/store/logStore.ts`
   `mapEventToEntry()` if you want it to appear in the battle log
   (return `null` to keep it quiet).

5. **Test** in `packages/battle-engine/src/__tests__/events.test.ts`:

   ```typescript
   const events = value(someAction(...));
   expect(findEvent(events, "unit_stunned")?.turns).toBe(2);
   ```

---

## Add a new error code

1. Add the code to `packages/shared/src/errors.ts`:

   ```typescript
   export const ErrorCode = {
     ...
     SILENCED: "silenced",
   } as const;
   ```

2. Add a default human message in `DEFAULT_ERROR_MESSAGES`:

   ```typescript
   silenced: "This unit cannot cast spells",
   ```

3. Return it from the failing action:

   ```typescript
   if (unit.isSilenced) return err(ErrorCode.SILENCED);
   ```

4. Callers handle it with a type-safe check:

   ```typescript
   if (isErr(result) && result.error.code === ErrorCode.SILENCED) {
     // branch specifically on this kind
   }
   ```

---

## Fix a gameplay bug

1. **Write a failing test first.** Reproducing the bug locks in the fix.
   Assert on events where possible, not state:

   ```typescript
   it("reproduces bug: X causes Y", () => {
     const events = value(someAction(state, ...));
     expect(findEvent(events, "expected_event")).toBeDefined();
   });
   ```

2. Find where the logic lives — usually `game.ts`, `deploy.ts`, `effects.ts`,
   or `damage.ts`.
3. Fix it.
4. Confirm the test passes: `pnpm turbo test`.
5. Make sure no other tests broke.

Don't skip step 1 — we've reintroduced bugs before by fixing without tests.

---

## Add a new socket event (client → server)

1. **Declare it** in `packages/shared/src/protocol.ts`:

   ```typescript
   export interface ClientToServerEvents {
     ...
     "my:new-event": (payload: { foo: string }) => void;
   }
   ```

2. **Handle it** in `packages/server/src/index.ts`. Always start with
   `requireGameContext(socket)` or `requireAuthOrError(socket)`:

   ```typescript
   socket.on("my:new-event", (payload) => {
     const ctx = requireGameContext(socket);
     if (!ctx) return;
     if (typeof payload?.foo !== "string") {
       return socket.emit("game:error", "Invalid payload");
     }
     // …do the thing…
     broadcastGameUpdate(ctx.room);
   });
   ```

3. **Emit it** from the client. If it's an action, add it to `GameActions` in
   `packages/client/src/store/actions/types.ts` and implement it in both
   `local.ts` and `online.ts`. Otherwise emit directly via `getSocket()`.

---

## Add a new game mode

You want a third mode beyond local / online / AI? The abstraction is ready:

1. Add `"replay"` (or whatever) to the `GameMode` union in
   `packages/client/src/store/gameStore.ts`.
2. Create `packages/client/src/store/actions/replay.ts` exporting
   `createReplayActions(store): GameActions`.
3. Extend the `getActions()` switch:

   ```typescript
   cachedActions =
     mode === "online" ? createOnlineActions(useGameStore) :
     mode === "replay" ? createReplayActions(useGameStore) :
     createLocalActions(useGameStore);
   ```

4. Update selectors in `packages/client/src/store/selectors.ts` so the UI
   reads the right state source.

The Battle UI won't need to change — it's mode-agnostic.

---

## Add a new UI screen

1. Create `packages/client/src/pages/MyScreen.tsx`.
2. Add the screen name to `Screen` in `packages/client/src/store/gameStore.ts`.
3. Wire it up in `packages/client/src/App.tsx`.
4. Navigate: `useGameStore.getState().setScreen("my-screen")`.

---

## Add a test

Tests live in `packages/battle-engine/src/__tests__/`. Pick the file that
matches your concern (see ARCHITECTURE.md test table). Import from
`./helpers.js` for shared fixtures:

```typescript
import { describe, it, expect } from "vitest";
import { buildDeck, makeUnit, value, errCode } from "./helpers.js";
import { createGame, currentPlayer, deployCard } from "../game.js";

describe("my feature", () => {
  it("does the thing", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    // arrange / act / assert
  });
});
```

Run one file: `cd packages/battle-engine && pnpm test -- combat.test.ts`.

**Prefer asserting on events** over diffing state:

```typescript
const events = value(attackAction(state, from, to));
expect(findEvent(events, "unit_ko")).toBeDefined();
```

Where `findEvent` is defined in the test file:

```typescript
function findEvent<K extends GameEvent["kind"]>(events: GameEvent[], kind: K) {
  return events.find(e => e.kind === kind) as Extract<GameEvent, { kind: K }> | undefined;
}
```

---

## Debug a browser issue

1. Open devtools → Console. Look for `[AI]` log lines — they contain full
   AI scoring breakdowns like: `"KO target (+20) + deal 8 damage (+8) = 28"`.
2. Network tab → WS → find the Socket.IO connection to `:3001`. You can see
   every event sent and received.
3. React DevTools + Zustand DevTools let you inspect the current store state.

---

## Debug a server issue

The server uses a structured logger:

```
2026-04-12T12:34:56Z INFO  [auth] a1b2c3d4 authenticated as Alice { playerId: 'abc12345' }
2026-04-12T12:35:01Z INFO  [match] Alice vs Bob { roomId: 'room-3' }
2026-04-12T12:40:12Z WARN  [queue] abc12345 deck rejected { reason: '...' }
```

Every log line is tagged (`[auth]`, `[queue]`, `[match]`, etc.) so you can
grep for just the area you care about.

Run with `pnpm dev` (uses `tsx watch` — auto-restart on changes).

---

## "I have no idea where this thing lives"

Quick lookup:

| Thing | File |
|-------|------|
| Game rules / damage formula | `packages/card-engine/src/damage.ts` |
| Card data | `packages/card-engine/src/cards/*.ts` |
| Card data validation | `packages/card-engine/src/cards/validate.ts` |
| Turn flow | `packages/battle-engine/src/game.ts` |
| Deploy (per-card-type handlers) | `packages/battle-engine/src/deploy.ts` |
| What happens when you play an item | `packages/battle-engine/src/effects.ts` |
| Win conditions | `packages/battle-engine/src/win.ts` |
| How the AI picks actions | `packages/battle-engine/src/ai/evaluate.ts` |
| GameEvent types | `packages/shared/src/events.ts` |
| Result<T>, ErrorCode | `packages/shared/src/errors.ts` |
| How the server validates moves | `packages/server/src/GameRoom.ts` |
| Server input validation | `packages/server/src/validate.ts` |
| Matchmaking queue | `packages/server/src/matchmaking.ts` |
| Session/auth tracking | `packages/server/src/sessions.ts` |
| What socket events exist | `packages/shared/src/protocol.ts` |
| How the client calls the engine | `packages/client/src/store/actions/local.ts` |
| How the client talks online | `packages/client/src/store/actions/online.ts` |
| Mode-agnostic selectors | `packages/client/src/store/selectors.ts` |
| Battle screen layout | `packages/client/src/pages/Battle.tsx` |
| Battle sub-components | `packages/client/src/components/battle/*.tsx` |
| Battle click handlers | `packages/client/src/hooks/useBattleSlotHandlers.ts` |
| Card rendering | `packages/client/src/components/CardView.tsx` |
| Battle log | `packages/client/src/store/logStore.ts` |
| Sound effects | `packages/client/src/lib/sounds.ts` |
| Tutorial content | `packages/client/src/components/HowToPlay.tsx` |
