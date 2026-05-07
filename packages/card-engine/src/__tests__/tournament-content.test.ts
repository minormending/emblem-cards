/**
 * Validates the static Tournament content authored in
 * @cards/shared/src/tournament. Lives here (not in shared) because
 * @cards/shared deliberately has zero runtime deps, and verifying
 * card IDs requires the card catalog from this package.
 */
import { describe, it, expect } from "vitest";
import { DECK_SIZE, MAX_CARD_COPIES } from "@cards/shared";
import { OPPONENTS, STARTER_POOL } from "@cards/shared";
import { getCardById } from "../cards/index.js";

describe("Tournament content", () => {
  describe("STARTER_POOL", () => {
    it("sizes within the 18-22 band", () => {
      expect(STARTER_POOL.length).toBeGreaterThanOrEqual(18);
      expect(STARTER_POOL.length).toBeLessThanOrEqual(22);
    });

    it("contains only real card IDs", () => {
      for (const id of STARTER_POOL) {
        expect(getCardById(id), `unknown card id: ${id}`).toBeDefined();
      }
    });

    it("has no duplicate entries", () => {
      expect(new Set(STARTER_POOL).size).toBe(STARTER_POOL.length);
    });

    it("includes at least one Lord", () => {
      const lords = STARTER_POOL
        .map((id) => getCardById(id))
        .filter((c) => c?.type === "unit" && c.isLord);
      expect(lords.length).toBeGreaterThanOrEqual(1);
    });

    it("covers all five card types", () => {
      const types = new Set(
        STARTER_POOL.map((id) => getCardById(id)!.type),
      );
      expect(types).toEqual(
        new Set(["unit", "weapon", "item", "tactic", "support"]),
      );
    });

    it("excludes flying and mounted units", () => {
      for (const id of STARTER_POOL) {
        const card = getCardById(id)!;
        if (card.type !== "unit") continue;
        const tags = card.tags ?? [];
        expect(tags, `${id} has forbidden tag`).not.toContain("flying");
        expect(tags, `${id} has forbidden tag`).not.toContain("mounted");
      }
    });

    it("excludes mage units (fire/wind/thunder attackType)", () => {
      const magicTypes = new Set(["fire", "wind", "thunder"]);
      for (const id of STARTER_POOL) {
        const card = getCardById(id)!;
        if (card.type !== "unit") continue;
        expect(
          magicTypes.has(card.attackType),
          `${id} is a mage unit (attackType=${card.attackType})`,
        ).toBe(false);
      }
    });

    it("has enough units to build a legal deck", () => {
      const unitCapacity = STARTER_POOL
        .map((id) => getCardById(id)!)
        .filter((c) => c.type === "unit")
        .reduce((sum, card) => {
          // Lords cap at 1 copy; everything else caps at MAX_CARD_COPIES.
          if (card.type !== "unit") return sum;
          return sum + (card.isLord ? 1 : MAX_CARD_COPIES);
        }, 0);
      // Need enough unit slots to reach DECK_SIZE even if other types are thin.
      // A sane floor: at least DECK_SIZE units possible.
      expect(unitCapacity).toBeGreaterThanOrEqual(DECK_SIZE);
    });
  });

  describe("OPPONENTS", () => {
    it("has exactly 8 entries", () => {
      expect(OPPONENTS.length).toBe(8);
    });

    it("has order values 1..8 in order", () => {
      const orders = OPPONENTS.map((o) => o.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("uses the expected AI preset mapping", () => {
      // #1-2 easy, #3-5 medium, #6-7 hard, #8 expert
      const expected: ReadonlyArray<string> = [
        "easy",
        "easy",
        "medium",
        "medium",
        "medium",
        "hard",
        "hard",
        "expert",
      ];
      expect(OPPONENTS.map((o) => o.ai)).toEqual(expected);
    });

    it("has unique opponent IDs", () => {
      const ids = OPPONENTS.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    for (const opp of OPPONENTS) {
      describe(`opponent #${opp.order} (${opp.id})`, () => {
        it("deck length equals DECK_SIZE", () => {
          expect(opp.deck.length).toBe(DECK_SIZE);
        });

        it("deck contains exactly one Lord", () => {
          const lords = opp.deck
            .map((id) => getCardById(id))
            .filter((c) => c?.type === "unit" && c.isLord);
          expect(lords.length).toBe(1);
        });

        it("respects max-copies limits", () => {
          const counts = new Map<string, number>();
          for (const id of opp.deck) {
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
          for (const [id, count] of counts) {
            const card = getCardById(id)!;
            const limit =
              card.type === "unit" && card.isLord ? 1 : MAX_CARD_COPIES;
            expect(count, `${id} exceeds copy limit`).toBeLessThanOrEqual(
              limit,
            );
          }
        });

        it("every card ID resolves", () => {
          for (const id of opp.deck) {
            expect(getCardById(id), `unknown card: ${id}`).toBeDefined();
          }
        });

        it("rewardCardId resolves and is not in STARTER_POOL", () => {
          expect(getCardById(opp.rewardCardId)).toBeDefined();
          expect(STARTER_POOL).not.toContain(opp.rewardCardId);
        });
      });
    }

    it("all reward IDs are mutually distinct", () => {
      const rewards = OPPONENTS.map((o) => o.rewardCardId);
      expect(new Set(rewards).size).toBe(rewards.length);
    });
  });
});
