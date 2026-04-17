import type { GameEvent } from '@cards/shared';
import { useFxStore } from './fxStore';

/**
 * Spawn center-screen card-played overlays from a batch of engine events.
 * Only fires for non-unit plays — items/tactics, weapons, and supports.
 */
export function spawnPlayedFromEvents(
  events: GameEvent[],
  ownerSide: 'own' | 'enemy' | null,
): void {
  const spawn = useFxStore.getState().spawnPlayedCard;
  for (const ev of events) {
    if (ev.kind === 'item_played') {
      spawn({ kind: 'item', card: ev.card });
    } else if (ev.kind === 'weapon_equipped') {
      spawn({ kind: 'weapon', card: ev.weapon, ownerSide: ownerSide ?? 'own' });
    } else if (ev.kind === 'support_activated') {
      spawn({ kind: 'support', card: ev.support, ownerSide: ownerSide ?? 'own' });
    }
  }
}
