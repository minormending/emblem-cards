# Editing cards

All cards live as JSON files under
[`packages/card-engine/src/cards/data/`](../packages/card-engine/src/cards/data/).
One file per card type:

| File             | Contains                                          |
| ---------------- | ------------------------------------------------- |
| `units.json`     | Playable units (Lords, Swordmasters, Mages, etc.) |
| `weapons.json`   | Weapons and tomes units can equip                 |
| `items.json`     | One-shot consumables (heals, buffs)               |
| `supports.json`  | Pair-bonus cards that activate when both classes are on the field |
| `tactics.json`   | One-shot board effects (damage, reposition, draw) |

You don't need to touch TypeScript. Edit JSON, save, run the checker, reload
the app.

## Workflow

1. Open the JSON file for the card type you're tuning
   (e.g. `units.json` to change a unit's stats).
2. Edit the value. To add a new card, copy an existing entry and change the
   fields. To remove, delete the entry.
3. From the repo root, run:
   ```sh
   pnpm cards:check
   ```
   You'll see either a green summary or a list of problems to fix.
4. Reload the game (`pnpm dev` if you're running it).

## Validator

`pnpm cards:check` runs two passes:

- **Shape check** (zod schemas) — catches typos in field names, wrong types,
  invalid enum values (e.g. a weapon with `"attackType": "lazer"`).
- **Semantic check** — catches duplicate card IDs, units where `stats.hp` and
  `maxHp` don't match, weapons that do literally nothing, etc.

Output looks like:

```
✓ units.json: 13 cards
✓ weapons.json: 11 cards
✓ items.json: 3 cards
✓ supports.json: 3 cards
✓ tactics.json: 4 cards
✓ semantic checks: duplicate ids, HP consistency, stat bounds
```

On failure it prints the file, the card id, and what's wrong. Fix and re-run.

## Field reference

### Every card

| Field    | Required | Notes                                                   |
| -------- | -------- | ------------------------------------------------------- |
| `type`   | yes      | `"unit"`, `"weapon"`, `"item"`, `"support"`, `"tactic"` |
| `id`     | yes      | Unique, lowercase-dashed (e.g. `"lord-marth"`)          |
| `name`   | yes      | Display name shown on the card                          |
| `cost`   | yes      | Energy cost to play (non-negative integer)              |
| `art`    | no       | `/cards/<filename>` — see [ADDING_CARD_ART.md](./ADDING_CARD_ART.md) |
| `flavor` | no       | Italicized flavor text                                  |

### `type: "unit"`

| Field        | Notes                                                    |
| ------------ | -------------------------------------------------------- |
| `class`      | Class name (e.g. `"Swordmaster"`). Used by supports.     |
| `attackType` | `"sword"`, `"axe"`, `"lance"`, `"bow"`, `"fire"`, `"wind"`, `"thunder"` |
| `maxHp`      | Positive integer. Must equal `stats.hp`.                 |
| `stats`      | `{ hp, str, mag, def, res, spd }` all non-negative ints  |
| `tags`       | At least one of `"flying"`, `"mounted"`, `"armored"`, `"infantry"` |
| `effects`    | Array of effects (see below). Empty array is fine.       |
| `isLord`     | `true` only for Lord units (1 required per deck)         |

### `type: "weapon"`

| Field        | Notes                                                    |
| ------------ | -------------------------------------------------------- |
| `attackType` | Must match the unit's weapon type to equip               |
| `statBoost`  | Subset of stats, e.g. `{ "str": 3 }`                     |
| `effects`    | Array of effects                                         |

A weapon must do *something* — either have a stat boost or an effect. The
validator flags dead weapons.

### `type: "item"` and `type: "tactic"`

Just `effects` plus the common fields.

### `type: "support"`

`pairRequirement: { classA, classB }` — both classes must be on the field for
the effects to activate.

## Effects

Effects are typed objects with a `kind` field. Each kind has its own payload.

| `kind`                         | Payload                                                          | Used by |
| ------------------------------ | ---------------------------------------------------------------- | ------- |
| `damage_multiplier_vs_tag`     | `tag: "flying"\|"mounted"\|"armored"\|"infantry"`, `multiplier: n` | bows vs. flyers, Hammers vs. armor |
| `double_attack`                | —                                                                | Swordmaster, Brave Sword |
| `heal_adjacent`                | `amount: n`                                                      | Cleric, Frontline Medic |
| `heal_target`                  | `amount: n`                                                      | Vulnerary |
| `buff_target`                  | `stat`, `amount`, `duration`                                     | Rally, Pure Water |
| `damage_target`                | `amount: n`                                                      | Bolting |
| `reposition`                   | `from`, `to` (each `{ row, col }`)                               | Rescue |
| `draw_cards`                   | `amount: n`                                                      | Thief, Convoy |
| `ranged`                       | —                                                                | bows, javelins, mages |
| `flying`                       | —                                                                | pegasi, wyverns |
| `pair_bonus`                   | `stat`, `amount`                                                 | supports |

If you need a new kind, that's an engineering change — ping a dev.

## Common mistakes the checker catches

- `stats.hp` doesn't equal `maxHp` → unit would spawn at wrong health.
- Two cards share an `id` → the second silently overrides the first.
- `attackType` misspelled → card won't render or equip correctly.
- Weapon with no `statBoost` and no `effects` → a dead card.
- `tags` empty on a unit → breaks targeting interactions.
- Trailing comma or missing quote in JSON → the file won't even parse.

## Renaming a card id

If you change an `id`, any saved deck that referenced the old id will silently
drop that card. Tell a dev before renaming so they can clean up referenced
data (saved decks, fixtures, tests).
