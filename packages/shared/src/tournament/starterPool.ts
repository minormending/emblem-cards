/**
 * Cards every player starts the tournament with.
 *
 * Constraints (see docs/TOURNAMENT_MODE.md §3.1):
 *   - 18-22 card IDs, complete enough to build a legal DECK_SIZE deck.
 *   - At least one Lord (satisfy the "has Lord" deckbuilding rule).
 *   - Covers all five card types (unit, weapon, item, tactic, support).
 *   - MUST NOT include flying or mounted units.
 *   - MUST NOT include mage units (attackType fire/wind/thunder) — these
 *     archetypes are tournament rewards, so the starter should feel plain.
 *
 * Validated at module-load by ./validate.ts.
 */
export const STARTER_POOL: readonly string[] = [
  // Lords (2 — player picks one)
  "lord-marth",
  "lord-ephraim",
  // Infantry units (no flying/mounted/mage)
  "swordmaster-karel",
  "thief-matthew",
  "berserker-hawkeye",
  "knight-oswin",
  "archer-wil",
  "general-wallace",
  "mercenary-raven",
  // Weapons — basic tier only; silver/magic tomes are rewards
  "iron-sword",
  "iron-axe",
  "iron-lance",
  "iron-bow",
  "javelin",
  // Items
  "vulnerary",
  "elixir",
  "goddess-icon",
  // Tactics
  "tactic-rally",
  "tactic-convoy",
  "tactic-rescue",
  // Support (Lord + Knight — both in pool)
  "support-brothers",
];
