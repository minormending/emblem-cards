import type { Card, FieldPosition } from "@cards/shared";
import { DECK_SIZE, MAX_CARD_COPIES } from "@cards/shared";
import { getCardById } from "@cards/card-engine";

/**
 * Validate a submitted deck. Returns { error } with a message or { cards }
 * with the canonical card objects on success.
 *
 * Trust no client: every submitted card id is resolved to the authoritative
 * card data from card-engine. A client that forges stats or invents ids
 * gets rejected; a client with a legal id set gets the real cards even if
 * they tried to send doctored copies.
 */
export type DeckValidation =
  | { ok: true; cards: Card[] }
  | { ok: false; error: string };

export function validateDeck(deck: unknown): DeckValidation {
  if (!Array.isArray(deck)) return { ok: false, error: "Deck must be an array" };
  if (deck.length !== DECK_SIZE) {
    return { ok: false, error: `Deck must be exactly ${DECK_SIZE} cards` };
  }

  let lordCount = 0;
  const counts = new Map<string, number>();
  const canonical: Card[] = [];

  for (const raw of deck as unknown[]) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid card in deck" };
    const id = (raw as { id?: unknown }).id;
    if (typeof id !== "string") return { ok: false, error: "Card missing id" };

    const real = getCardById(id);
    if (!real) return { ok: false, error: `Unknown card: ${id}` };

    const n = (counts.get(id) ?? 0) + 1;
    counts.set(id, n);
    if (n > MAX_CARD_COPIES) return { ok: false, error: `Too many copies of ${id}` };

    if (real.type === "unit" && real.isLord) lordCount++;
    canonical.push(real);
  }

  if (lordCount !== 1) return { ok: false, error: "Deck must contain exactly 1 Lord" };
  return { ok: true, cards: canonical };
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
