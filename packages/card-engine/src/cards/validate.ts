import type { Card } from "@cards/shared";

/**
 * Validate all card definitions at module load.
 *
 * Catches common authoring mistakes immediately — e.g. maxHp not matching
 * the unit's starting HP, duplicate card IDs, or units with invalid stats.
 *
 * Called once from cards/index.ts. If any invariant is violated, we throw
 * with a detailed message so the bad card is easy to find.
 */
export function validateCardData(cards: Card[]): void {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const tag = `${card.type}:${card.id}`;

    // Every card needs a unique id
    if (seen.has(card.id)) {
      issues.push(`${tag} — duplicate card id`);
    }
    seen.add(card.id);

    // Every card needs a positive cost
    if (typeof card.cost !== "number" || card.cost < 0) {
      issues.push(`${tag} — cost must be >= 0 (got ${card.cost})`);
    }

    if (card.type === "unit") {
      // Unit-specific invariants
      if (card.stats.hp !== card.maxHp) {
        issues.push(`${tag} — maxHp (${card.maxHp}) must equal stats.hp (${card.stats.hp})`);
      }
      if (card.maxHp <= 0) {
        issues.push(`${tag} — maxHp must be > 0`);
      }
      if (card.stats.str < 0 || card.stats.mag < 0 || card.stats.def < 0 || card.stats.res < 0 || card.stats.spd < 0) {
        issues.push(`${tag} — all stats must be >= 0`);
      }
      if (!card.class) {
        issues.push(`${tag} — unit class is required`);
      }
      if (card.tags.length === 0) {
        issues.push(`${tag} — at least one tag is required`);
      }
    }

    if (card.type === "weapon") {
      // Weapons need at least a str or mag boost to do anything useful
      const boostsAnything =
        (card.statBoost.str ?? 0) > 0 ||
        (card.statBoost.mag ?? 0) > 0 ||
        card.effects.length > 0;
      if (!boostsAnything) {
        issues.push(`${tag} — weapon has no effect and no stat boost`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Card data validation failed:\n  ${issues.join("\n  ")}\n` +
      `Fix these in packages/card-engine/src/cards/`
    );
  }
}
