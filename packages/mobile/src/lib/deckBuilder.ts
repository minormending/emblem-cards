import type { Card } from '@cards/shared';
import { cloneCard, DECK_SIZE, MAX_CARD_COPIES } from '@cards/shared';
import { allCards, units } from '@cards/card-engine';

export function buildRandomDeck(): Card[] {
  const lords = units.filter((u) => u.isLord);
  const nonLords = allCards.filter((c) => !(c.type === 'unit' && c.isLord));
  if (lords.length === 0) throw new Error('No Lord cards defined');
  if (nonLords.length === 0) throw new Error('No non-Lord cards defined');

  const deck: Card[] = [];
  deck.push(cloneCard(lords[Math.floor(Math.random() * lords.length)]));

  let safetyGuard = DECK_SIZE * 50;
  while (deck.length < DECK_SIZE) {
    if (--safetyGuard <= 0) throw new Error('Not enough unique non-Lord cards');
    const card = nonLords[Math.floor(Math.random() * nonLords.length)];
    const copies = deck.filter((c) => c.id === card.id).length;
    if (copies < MAX_CARD_COPIES) deck.push(cloneCard(card));
  }
  return deck;
}
