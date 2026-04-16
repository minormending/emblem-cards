// ── Elements ──

export type WeaponType = "sword" | "axe" | "lance";
export type MagicType = "fire" | "wind" | "thunder";
export type RangedType = "bow";
export type AttackType = WeaponType | MagicType | RangedType;

// ── Unit Tags ──

export type UnitTag = "flying" | "mounted" | "armored" | "infantry";

// ── Stats ──

export interface Stats {
  hp: number;
  str: number;
  mag: number;
  def: number;
  res: number;
  spd: number;
}

// ── Effects ──

/** Effects are baked into the card text. The engine resolves them by kind. */
/**
 * All card/unit effects. Each variant has a `kind` discriminator and its own payload.
 *
 * Effects are resolved in several places depending on their type:
 *   - Damage-time  : damage_multiplier_vs_tag, double_attack (see card-engine/damage.ts)
 *   - End of turn  : heal_adjacent (see battle-engine/game.ts)
 *   - On deploy    : draw_cards (see battle-engine/game.ts deployCard)
 *   - Item/tactic  : heal_target, damage_target, buff_target, reposition, draw_cards
 *                    (see battle-engine/effects.ts)
 *   - Passive flag : ranged, flying (checked in battle-engine/field.ts canReach)
 *   - Support      : pair_bonus (see card-engine/damage.ts getSupportStatBonus)
 */
export type Effect =
  /** e.g. Archer: 3x damage vs flying units. Applies during damage calc. */
  | { kind: "damage_multiplier_vs_tag"; tag: UnitTag; multiplier: number }
  /** e.g. Swordmaster, Brave Sword: attack hits twice. */
  | { kind: "double_attack" }
  /** e.g. Cleric: heal adjacent allied units at end of turn. */
  | { kind: "heal_adjacent"; amount: number }
  /** Restore HP to a targeted own unit (items). Capped at maxHp. */
  | { kind: "heal_target"; amount: number }
  /** Buff a stat on a targeted own unit. Duration is NOT currently tracked. */
  | { kind: "buff_target"; stat: keyof Stats; amount: number; duration: number }
  /** Deal direct damage to an enemy unit (tactics). */
  | { kind: "damage_target"; amount: number }
  /** Swap a unit with the opposite row at the same column. from/to are templates. */
  | { kind: "reposition"; from: FieldPosition; to: FieldPosition }
  /** Draw cards for the current player. Used by Thief (on deploy) and tactics. */
  | { kind: "draw_cards"; amount: number }
  /** Unit/weapon is ranged: can attack from back row, can hit enemy back row. */
  | { kind: "ranged" }
  /** Unit is flying: same as ranged, plus takes bonus damage from anti-flying effects. */
  | { kind: "flying" }
  /** Support card: grants a stat bonus while its pair of classes is active on the field. */
  | { kind: "pair_bonus"; stat: keyof Stats; amount: number };

// ── Card Types ──

export interface UnitCard {
  type: "unit";
  id: string;
  name: string;
  class: string;
  attackType: AttackType;
  stats: Stats;
  maxHp: number; // original HP for HP bar display
  tags: UnitTag[];
  effects: Effect[];
  cost: number; // deployment cost
  isLord: boolean;
  flavor?: string;
}

export interface WeaponCard {
  type: "weapon";
  id: string;
  name: string;
  attackType: AttackType;
  statBoost: Partial<Stats>;
  effects: Effect[];
  cost: number;
  flavor?: string;
}

export interface ItemCard {
  type: "item";
  id: string;
  name: string;
  effects: Effect[];
  cost: number;
  flavor?: string;
}

export interface SupportCard {
  type: "support";
  id: string;
  name: string;
  /** IDs or class names of the two units that activate the pair */
  pairRequirement: { classA: string; classB: string };
  effects: Effect[];
  cost: number;
  flavor?: string;
}

export interface TacticCard {
  type: "tactic";
  id: string;
  name: string;
  effects: Effect[];
  cost: number;
  flavor?: string;
}

export type Card = UnitCard | WeaponCard | ItemCard | SupportCard | TacticCard;

// ── Field ──

export type FieldRow = "front" | "back";
export type FieldCol = 0 | 1 | 2;
export interface FieldPosition {
  row: FieldRow;
  col: FieldCol;
}

export interface FieldSlot {
  unit: UnitCard | null;
  weapon: WeaponCard | null;
  hasActed: boolean;
}

export type Field = Record<FieldRow, [FieldSlot, FieldSlot, FieldSlot]>;

// ── Player ──

export interface Player {
  id: string;
  name: string;
  deck: Card[];
  hand: Card[];
  field: Field;
  discardPile: Card[];
  energy: number;
  maxEnergy: number;
  activeSupportCards: SupportCard[];
}

// ── Game State ──

/**
 * Coarse sub-step within a turn. Currently informational only — no engine
 * code enforces transitions between steps.
 */
export type TurnStep = "draw" | "deploy" | "action" | "cleanup";

export interface GameState {
  players: [Player, Player];
  currentPlayerIndex: 0 | 1;
  turnNumber: number;
  turnStep: TurnStep;
  winner: string | null;
}
