# @cards/card-engine

All card data and pure per-card functions. **No game state, no mutation,
no I/O.** Given two cards, returns a number. Given a JSON file, returns a
validated array. This is the package balance changes flow through.

Consumed by [`@cards/battle-engine`](../battle-engine), the web
[`client`](../client), the [`mobile`](../mobile) app, and the [`server`](../server).

---

## File map

| File | Purpose |
| --- | --- |
| [`cards/data/*.json`](src/cards/data/) | One JSON file per card type — `units`, `weapons`, `items`, `supports`, `tactics`. Balance work happens here. |
| [`cards/index.ts`](src/cards/index.ts) | Loads every JSON file, validates with Zod, runs semantic checks, exposes `units`, `weapons`, `items`, `supports`, `tactics`, `allCards`, and `getCardById()`. Fail-fast: bad data throws at import time. |
| [`cards/schema.ts`](src/cards/schema.ts) | Zod schemas for each card type. Catches typos and wrong enum values at load time. |
| [`cards/validate.ts`](src/cards/validate.ts) | Semantic checks beyond schema: duplicate IDs, `stats.hp === maxHp`, non-negative stats, dead-weapon detection, Lord tagging. |
| [`damage.ts`](src/damage.ts) | `calculateDamage()` — the STR/MAG vs DEF/RES formula with triangle bonus, tag multipliers, double attacks, and support pair bonuses. Pure. |
| [`triangles.ts`](src/triangles.ts) | Weapon triangle (sword → axe → lance) and magic triangle (fire → wind → thunder) lookups. |
| [`scripts/check-cards.ts`](scripts/check-cards.ts) | CLI entry point for `pnpm cards:check`. Validates JSON files *and* cross-references art files on disk. |

---

## Card schema highlights

### IDs — strict, path-safe

```ts
z.string().regex(/^[a-z0-9-]+$/)
```

IDs feed into asset URLs (`/cards/<id>.png`) and Map keys. Restricting to
lowercase alphanumerics + hyphens keeps them log-safe, path-safe, and
URL-safe. Whitespace / dots / slashes are rejected. A typo in a JSON
file fails the schema immediately.

### Card fields common to every type

```ts
{
  id: CardIdSchema,                   // ^[a-z0-9-]+$
  name: z.string().min(1),
  cost: z.number().int().nonnegative(),
  flavor: z.string().optional(),
}
```

There is **no `art` field**. Art is derived from the id at render time —
see [`docs/ADDING_CARD_ART.md`](../../docs/ADDING_CARD_ART.md).

### Type-specific fields

- **Unit** — `class`, `attackType`, `maxHp`, `stats`, `tags[]`, `effects[]`, `isLord`.
- **Weapon** — `attackType`, `statBoost`, `effects[]`.
- **Item / Tactic / Support** — `effects[]` + type-specific extras (e.g.
  Support's `pairRequirement`).

See [`cards/schema.ts`](src/cards/schema.ts) for the full list and
[`../shared/src/types.ts`](../shared/src/types.ts) for the TypeScript
contract.

---

## `calculateDamage()` — the formula in one paragraph

Physical attackers compute `STR + weaponBoost + triangleBonus +
supportBonus - DEF`, floored at 1. Magical attackers use `MAG` and `RES`.
A tag multiplier (e.g. Archer's 3× vs flying, Hammer's 2× vs armored) is
applied after the subtraction. Double-attack effects double the total.
The function is pure and returns the full breakdown
(`hits`, `damagePerHit`, `totalDamage`, `triangleBonus`, `tagMultiplier`)
so the UI can render damage previews without calling the game engine.

Weapons whose `statBoost` specifies `str` but are equipped by a magical
attacker (fire/wind/thunder) still work — `getWeaponBoost()` treats STR
and MAG as interchangeable "attack-stat" labels. Same for the
`buff_target` tactic effect. Author one side, get both.

---

## Validation — what `pnpm cards:check` runs

```bash
pnpm cards:check         # from repo root
# or
pnpm --filter @cards/card-engine cards:check
```

Runs [`scripts/check-cards.ts`](scripts/check-cards.ts) which:

1. Reads each JSON file in `cards/data/`.
2. Parses with the Zod schemas. Pretty-prints issues if shape fails.
3. Runs `validateCardData()` — cross-file semantic rules.
4. **Cross-references art files.** Walks
   [`../client/public/cards/`](../client/public/cards/) and fails if any
   PNG there doesn't match a known card id. This catches renames and
   stale assets before they ship — e.g. if someone drops `knight.png` but
   the card id is `knight-oswin`, CI blocks the deploy instead of
   silently 404-ing in production.

The checker is also wired into `turbo test` so CI catches issues on
every PR.

---

## Adding a card

1. Edit the relevant JSON file in [`cards/data/`](src/cards/data/). Copy
   an existing row that roughly matches the card's role, tweak the id +
   stats + effects.
2. Run `pnpm cards:check` to catch typos and stat-sum issues early.
3. Optionally drop a PNG into
   [`../client/public/cards/`](../client/public/cards/) named
   `<id>.png`. See [`docs/ADDING_CARD_ART.md`](../../docs/ADDING_CARD_ART.md).
4. `pnpm --filter @cards/card-engine build` before running the client if
   the consumer imports from `dist/` (Vite dev picks up source via the
   `exports.source` workspace condition, but builds need `dist/` fresh).

More detail and recipes: [`docs/EDITING_CARDS.md`](../../docs/EDITING_CARDS.md)
and [`docs/MAKING_CHANGES.md`](../../docs/MAKING_CHANGES.md).

---

## Purity rule

**Nothing here reads a file at runtime, hits the network, or mutates
global state.** JSON files are imported statically (Vite + Node both
inline them at module-load via `with { type: "json" }`). The whole
package is safe to call from anywhere — the battle engine, the AI
scorer, a unit test, a damage-preview UI component.

Don't add logic that needs Node APIs here. If validation needs the file
system (as `scripts/check-cards.ts` does for the art cross-reference),
keep it in `scripts/` outside the importable surface.

---

## Commands

```bash
pnpm --filter @cards/card-engine build      # emit dist/ for consumers that don't use the source condition
pnpm --filter @cards/card-engine test       # vitest
pnpm --filter @cards/card-engine cards:check  # schema + semantic + art cross-reference
```

---

## Who depends on this

- [`@cards/battle-engine`](../battle-engine) — uses the damage formula and card lookups.
- [`@cards/server`](../server) — resolves deck submissions against `getCardById()`.
- [`@cards/client`](../client) and [`@cards/mobile`](../mobile) — render the cards.

A breaking change in a JSON schema cascades into every consumer. TypeScript
and the test suites catch most of it; `pnpm cards:check` catches the rest.
