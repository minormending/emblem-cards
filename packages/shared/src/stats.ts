import type { GameEvent } from "./events.js";
import type { FieldSlot, GameState, UnitCard } from "./types.js";

/**
 * End-of-match stats rendered on the WinnerScreen. Derived purely from the
 * event log + final GameState — no separate tracking required.
 *
 * All "side" fields are from the winner's perspective so the UI can highlight
 * accomplishments ("your MVP") without branching on mode.
 */
export interface MatchStats {
  /** Winner's highest total-damage unit, if any damage was dealt at all. */
  mvp: {
    unit: UnitCard;
    totalDamage: number;
  } | null;
  /** The unit that landed the final blow on the losing Lord, if combat-decided. */
  killingBlow: {
    attacker: UnitCard;
    defender: UnitCard;
  } | null;
  /** The single highest-damage attack in the match (any side). */
  biggestHit: {
    amount: number;
    attackerName: string;
    defenderName: string;
  } | null;
  turnCount: number;
  /** Descriptor for how the match went. Null if nothing notable. */
  modifier: MatchModifier;
}

export type MatchModifier =
  | "flawless"   // winner's Lord was never damaged
  | "dominant"   // ≤6 turns
  | "close"      // winner's Lord below 20% HP at end
  | "comeback"   // winner's Lord was ever at ≤30% HP
  | "methodical" // >14 turns
  | null;

/**
 * Compute stats from the completed match. Pure function — safe to run on
 * server and client from the same inputs.
 *
 * `winnerId` should be the player whose stats we want to celebrate. For a
 * draw or no-winner case, pass null — returned stats will be minimal.
 */
export function computeMatchStats(
  state: GameState,
  events: GameEvent[],
  winnerId: string | null,
): MatchStats {
  const turnCount = state.turnNumber;

  if (!winnerId) {
    return { mvp: null, killingBlow: null, biggestHit: null, turnCount, modifier: null };
  }

  // ── MVP: winner's unit with most total damage dealt ──
  // Key by unit.id so multiple copies of the same card are distinguished
  // (each deck slot is a distinct instance). Fall back to name if id absent.
  const damageByUnit = new Map<string, { unit: UnitCard; total: number }>();
  for (const ev of events) {
    if (ev.kind !== "unit_damaged") continue;
    if (ev.attackerOwner !== winnerId) continue;
    if (!ev.attackerUnit) continue;
    const key = ev.attackerUnit.id;
    const prev = damageByUnit.get(key);
    if (prev) {
      prev.total += ev.amount;
    } else {
      damageByUnit.set(key, { unit: ev.attackerUnit, total: ev.amount });
    }
  }
  let mvp: MatchStats["mvp"] = null;
  for (const { unit, total } of damageByUnit.values()) {
    if (!mvp || total > mvp.totalDamage) mvp = { unit, totalDamage: total };
  }

  // ── Killing blow: unit that landed the last unit_damaged before game_won ──
  // Walk the events in reverse from the terminal game_won; pick the
  // most recent unit_damaged where the winner was the attacker.
  let killingBlow: MatchStats["killingBlow"] = null;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.kind !== "unit_damaged") continue;
    if (ev.attackerOwner !== winnerId) continue;
    if (!ev.attackerUnit || !ev.defenderUnit) continue;
    // Killing blow only counts if the target is a Lord (game-ending hit).
    if (!ev.defenderUnit.isLord) continue;
    killingBlow = { attacker: ev.attackerUnit, defender: ev.defenderUnit };
    break;
  }

  // ── Biggest hit: any side, single largest damage event ──
  let biggestHit: MatchStats["biggestHit"] = null;
  for (const ev of events) {
    if (ev.kind !== "unit_damaged") continue;
    if (!biggestHit || ev.amount > biggestHit.amount) {
      biggestHit = {
        amount: ev.amount,
        attackerName: ev.attackerName ?? "Unknown",
        defenderName: ev.defenderName ?? "Unknown",
      };
    }
  }

  // ── Modifier: pick one descriptor, priority order ──
  const modifier = computeModifier(state, events, winnerId, turnCount);

  return { mvp, killingBlow, biggestHit, turnCount, modifier };
}

function computeModifier(
  state: GameState,
  events: GameEvent[],
  winnerId: string,
  turnCount: number,
): MatchModifier {
  const winner = state.players.find((p) => p.id === winnerId);
  if (!winner) return null;
  const allSlots: FieldSlot[] = [...winner.field.front, ...winner.field.back];
  const winnerLord = allSlots.find((slot) => slot.unit?.isLord)?.unit;

  // Track the lowest HP winner's Lord ever saw across damage events.
  let winnerLordEverDamaged = false;
  let winnerLordMinHpFraction = 1;
  for (const ev of events) {
    if (ev.kind !== "unit_damaged") continue;
    if (!ev.defenderUnit?.isLord) continue;
    // Is this the winner's lord? Position + field side: attackerOwner of the
    // damage is the OPPONENT when winner's lord is being hit.
    if (ev.attackerOwner === winnerId) continue;
    if (!ev.defenderUnit) continue;
    // Same lord identity? Match by unit id.
    if (winnerLord && ev.defenderUnit.id !== winnerLord.id) continue;
    winnerLordEverDamaged = true;
    const maxHp = ev.defenderMaxHp ?? winnerLord?.maxHp ?? ev.hpAfter + ev.amount;
    if (maxHp > 0) {
      const fraction = ev.hpAfter / maxHp;
      if (fraction < winnerLordMinHpFraction) winnerLordMinHpFraction = fraction;
    }
  }

  // Priority: flawless > comeback > close > dominant > methodical.
  if (!winnerLordEverDamaged) return "flawless";
  if (winnerLordMinHpFraction <= 0.3) return "comeback";
  if (winnerLordMinHpFraction < 0.2) return "close";
  if (turnCount <= 6) return "dominant";
  if (turnCount > 14) return "methodical";
  return null;
}
