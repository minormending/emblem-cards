import type { Card, FieldPosition } from "@cards/shared";
import { DECK_SIZE, MAX_CARD_COPIES } from "@cards/shared";

/**
 * Validate a submitted deck. Returns error message or null if the deck is legal.
 * The server re-validates to prevent clients from submitting illegal decks.
 */
export function validateDeck(deck: unknown): string | null {
  if (!Array.isArray(deck)) return "Deck must be an array";
  if (deck.length !== DECK_SIZE) return `Deck must be exactly ${DECK_SIZE} cards`;

  let lordCount = 0;
  const counts = new Map<string, number>();

  for (const card of deck as Card[]) {
    if (!card || typeof card !== "object") return "Invalid card in deck";
    if (typeof card.id !== "string") return "Card missing id";
    if (typeof card.type !== "string") return "Card missing type";

    const n = (counts.get(card.id) ?? 0) + 1;
    counts.set(card.id, n);
    if (n > MAX_CARD_COPIES) return `Too many copies of ${card.id}`;

    if (card.type === "unit" && card.isLord) lordCount++;
  }

  if (lordCount !== 1) return "Deck must contain exactly 1 Lord";
  return null;
}

/** Socket protocol sanity check: the position object has valid row/col. */
export function isValidFieldPosition(pos: unknown): pos is FieldPosition {
  if (!pos || typeof pos !== "object") return false;
  const p = pos as { row?: unknown; col?: unknown };
  if (p.row !== "front" && p.row !== "back") return false;
  if (p.col !== 0 && p.col !== 1 && p.col !== 2) return false;
  return true;
}

/** Socket protocol sanity check: the hand index is a reasonable integer. */
export function isValidHandIndex(idx: unknown): idx is number {
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx < 20;
}
