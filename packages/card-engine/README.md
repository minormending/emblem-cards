# @cards/card-engine

All card data + pure per-card functions. No game state, no mutation, no I/O. Given two cards, returns a number.

## What lives here

| File | Purpose |
|---|---|
| [`cards/data/*.json`](src/cards/data/) | Card data — one JSON file per type (`units`, `weapons`, `items`, `supports`, `tactics`). This is where balance work happens. See [`docs/EDITING_CARDS.md`](../../docs/EDITING_CARDS.md). |
| [`cards/index.ts`](src/cards/index.ts) | Loads every JSON file, validates it, exposes `units`, `weapons`, `items`, `supports`, `tactics`, and `allCards` arrays. |
| [`cards/schema.ts`](src/cards/schema.ts) | Zod schemas for each card type. Catches typos and wrong enum values at load time. |
| [`cards/validate.ts`](src/cards/validate.ts) | Semantic checks beyond schema: duplicate IDs, `stats.hp === maxHp`, no dead weapons, tag validity, etc. |
| [`damage.ts`](src/damage.ts) | `calculateDamage()` — the STR/MAG vs DEF/RES formula with triangle bonus, tag multipliers, double attacks, and support pair bonuses. |
| [`triangles.ts`](src/triangles.ts) | Weapon triangle (sword → axe → lance) and magic triangle (fire → wind → thunder) lookups. |

## The damage formula (1-paragraph version)

Physical attackers compute `STR + weaponBoost + triangleBonus + supportBonus - DEF`, floored at 1. Magical attackers use `MAG` and `RES`. A tag multiplier (e.g. Archer's 3× vs flying, Hammer's 2× vs armored) is applied after the subtraction. Double-attack effects double the total. `calculateDamage()` is pure and returns the full breakdown (`hits`, `damagePerHit`, `totalDamage`, `triangleBonus`, `tagMultiplier`) so the UI can show damage previews without calling the game engine.

## STR/MAG fallback

A weapon whose `statBoost` specifies `str` but is equipped by a magical attacker (fire/wind/thunder) still works — `getWeaponBoost()` treats STR and MAG as interchangeable "attack-stat" labels. Same for the `buff_target` tactic effect in the battle engine. You only need to author one side.

## Working with cards

Just edit the JSON. See [`docs/EDITING_CARDS.md`](../../docs/EDITING_CARDS.md) for the full field reference.

Validation commands:

```bash
pnpm cards:check              # from repo root — shape + semantic checks
pnpm --filter @cards/card-engine test   # full unit test suite
pnpm --filter @cards/card-engine build  # emit dist/ for consumers
```

## Design rule

**Purity.** Nothing here reads a file at runtime, hits the network, or mutates global state. The whole package is safe to call from anywhere — the battle engine, the AI scorer, a unit test, a damage-preview UI component. Keep it that way.
