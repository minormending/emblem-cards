import type { Card } from "@cards/shared";
import { cloneCard, DECK_SIZE, MAX_CARD_COPIES } from "@cards/shared";
import { allCards, units } from "./cards/index.js";

/**
 * Generate a valid random deck: 1 Lord + (DECK_SIZE-1) random non-Lord cards,
 * each capped at MAX_CARD_COPIES. Every card is cloned so deck slots don't
 * share references (prevents HP/state from leaking between copies).
 */
export function buildRandomDeck(): Card[] {
  const lords = units.filter((u) => u.isLord);
  const nonLords = allCards.filter((c) => !(c.type === "unit" && c.isLord));

  if (lords.length === 0) {
    throw new Error("Cannot build deck: no Lord cards defined in card set");
  }
  if (nonLords.length === 0) {
    throw new Error("Cannot build deck: no non-Lord cards defined in card set");
  }

  const deck: Card[] = [];
  deck.push(cloneCard(lords[Math.floor(Math.random() * lords.length)]));

  let safetyGuard = DECK_SIZE * 50;
  while (deck.length < DECK_SIZE) {
    if (--safetyGuard <= 0) {
      throw new Error("Cannot build deck: not enough unique non-Lord cards");
    }
    const card = nonLords[Math.floor(Math.random() * nonLords.length)];
    const copies = deck.filter((c) => c.id === card.id).length;
    if (copies < MAX_CARD_COPIES) deck.push(cloneCard(card));
  }
  return deck;
}
