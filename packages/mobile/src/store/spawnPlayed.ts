import type { GameEvent, GameState } from '@cards/shared';
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

/** Spotlight the slots an action applied to, using the local GameState to
 *  resolve whose field each target position lives on. */
export function spawnSpotlightsFromEvents(
  events: GameEvent[],
  state: GameState,
  viewerId: string,
  actorSide: 'own' | 'enemy',
): void {
  const spawn = useFxStore.getState().spawnSpotlight;
  for (const ev of events) {
    if (ev.kind === 'weapon_equipped' || ev.kind === 'unit_deployed') {
      spawn({ side: actorSide, pos: ev.position });
    } else if (
      ev.kind === 'unit_damaged' ||
      ev.kind === 'unit_healed' ||
      ev.kind === 'unit_buffed'
    ) {
      const side = sideForPosition(state, viewerId, ev.position);
      if (side) spawn({ side, pos: ev.position });
    }
  }
}

/** Online-mode spotlight spawn — no GameState, so rely on event metadata. */
export function spawnSpotlightsFromEventsOnline(
  events: GameEvent[],
  viewerId: string,
  actorId: string | null,
): void {
  const spawn = useFxStore.getState().spawnSpotlight;
  const actorSide: 'own' | 'enemy' = actorId === viewerId ? 'own' : 'enemy';

  for (const ev of events) {
    if (ev.kind === 'weapon_equipped' || ev.kind === 'unit_deployed') {
      spawn({ side: actorSide, pos: ev.position });
    } else if (ev.kind === 'unit_damaged') {
      const attackerOwner = ev.attackerOwner ?? actorId;
      const targetSide: 'own' | 'enemy' = attackerOwner === viewerId ? 'enemy' : 'own';
      spawn({ side: targetSide, pos: ev.position });
    } else if (ev.kind === 'unit_healed' || ev.kind === 'unit_buffed') {
      spawn({ side: actorSide, pos: ev.position });
    }
  }
}

function sideForPosition(
  state: GameState,
  viewerId: string,
  pos: { row: 'front' | 'back'; col: 0 | 1 | 2 },
): 'own' | 'enemy' | null {
  for (const player of state.players) {
    const slot = player.field[pos.row][pos.col];
    if (slot.unit) {
      return player.id === viewerId ? 'own' : 'enemy';
    }
  }
  return null;
}
