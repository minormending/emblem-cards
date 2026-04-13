import type {
  AttackType,
  Card,
  FieldPosition,
  ItemCard,
  Stats,
  SupportCard,
  TacticCard,
  UnitCard,
  WeaponCard,
} from "./types.js";

/**
 * A discrete thing that happened during a game action.
 *
 * Every state-mutating engine action (deployCard, attackAction, endTurn, etc.)
 * returns a list of events describing exactly what it did. Consumers can:
 *
 *   - Animate (find unit_damaged → shake that slot)
 *   - Log (human-readable strings per event type)
 *   - Assert in tests (find unit_ko → the attack killed something)
 *   - Broadcast over the network (events are serializable)
 *
 * The state mutation is still authoritative — events are a parallel
 * description of what just changed, not a causal log you'd re-apply.
 *
 * Rules for adding a new event kind:
 *   1. Add a variant to this union.
 *   2. Add a case to formatEvent() below.
 *   3. Emit it from the engine function that causes it.
 *   4. (Optional) Have UI/tests consume it.
 */
export type GameEvent =
  // ── Deploy-time ──
  | { kind: "unit_deployed"; position: FieldPosition; unit: UnitCard }
  | { kind: "weapon_equipped"; position: FieldPosition; weapon: WeaponCard; displaced: WeaponCard | null }
  | { kind: "support_activated"; support: SupportCard }
  | { kind: "support_duplicate_discarded"; support: SupportCard }
  | { kind: "item_played"; card: ItemCard | TacticCard; target: FieldPosition | null }

  // ── Damage and healing ──
  | {
      kind: "unit_damaged";
      position: FieldPosition;
      amount: number;
      hpAfter: number;
      source?: FieldPosition;
      /** Names of the units involved — present for engine-emitted combat events. */
      attackerName?: string;
      defenderName?: string;
      defenderMaxHp?: number;
      /** Attacker's element — drives VFX tint and icon. */
      attackerAttackType?: AttackType;
      /** True when this hit is the defender's counter-attack reaction. */
      isCounter?: boolean;
    }
  | { kind: "unit_healed"; position: FieldPosition; amount: number; hpAfter: number }
  | { kind: "unit_buffed"; position: FieldPosition; stat: keyof Stats; amount: number }
  | { kind: "unit_ko"; position: FieldPosition; unit: UnitCard }
  | { kind: "unit_moved"; from: FieldPosition; to: FieldPosition }

  // ── Card flow ──
  | { kind: "cards_drawn"; player: string; amount: number }
  | { kind: "card_discarded"; player: string; card: Card }

  // ── Turn flow ──
  | { kind: "turn_ended"; endingPlayer: string; nextPlayer: string; turnNumber: number }
  | { kind: "energy_changed"; player: string; from: number; to: number }

  // ── Terminal ──
  | { kind: "game_won"; winner: string; reason: "lord_ko" | "rout" | "deck_out" | "forfeit" };

/**
 * Render an event as a human-readable string. UI log panels can use this
 * to produce default text; specialized renderers can pattern-match on kind.
 */
export function formatEvent(event: GameEvent): string {
  switch (event.kind) {
    case "unit_deployed":
      return `${event.unit.name} deployed to ${event.position.row} ${event.position.col + 1}`;
    case "weapon_equipped":
      return event.displaced
        ? `${event.weapon.name} equipped (replaces ${event.displaced.name})`
        : `${event.weapon.name} equipped`;
    case "support_activated":
      return `${event.support.name} activated`;
    case "support_duplicate_discarded":
      return `${event.support.name} discarded (duplicate)`;
    case "item_played":
      return `${event.card.name} played`;
    case "unit_damaged": {
      const hpText = event.defenderMaxHp
        ? `${event.hpAfter}/${event.defenderMaxHp} HP`
        : `${event.hpAfter} HP`;
      if (event.attackerName && event.defenderName) {
        const verb = event.isCounter ? "counters" : "attacks";
        return `${event.attackerName} ${verb} ${event.defenderName} for ${event.amount} damage (${hpText})`;
      }
      if (event.defenderName) {
        return `${event.defenderName} takes ${event.amount} damage (${hpText})`;
      }
      return `-${event.amount} HP (${event.hpAfter} remaining)`;
    }
    case "unit_healed":
      return `+${event.amount} HP (${event.hpAfter} current)`;
    case "unit_buffed":
      return `+${event.amount} ${event.stat.toUpperCase()}`;
    case "unit_ko":
      return `${event.unit.name} defeated!`;
    case "unit_moved":
      return `moved ${event.from.row} ${event.from.col + 1} → ${event.to.row} ${event.to.col + 1}`;
    case "cards_drawn":
      return `${event.player} drew ${event.amount}`;
    case "card_discarded":
      return `${event.player} discarded ${event.card.type}`;
    case "turn_ended":
      return `${event.endingPlayer} ended their turn`;
    case "energy_changed":
      return `${event.player} energy ${event.from} → ${event.to}`;
    case "game_won":
      return `${event.winner} wins (${event.reason.replace("_", " ")})`;
  }
}
