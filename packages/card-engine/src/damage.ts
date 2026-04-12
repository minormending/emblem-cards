import type { UnitCard, WeaponCard, Effect, UnitTag, SupportCard, Stats } from "@cards/shared";
import { getTriangleBonus } from "./triangles.js";

export interface DamageResult {
  hits: number; // 1 or 2 (double attack)
  damagePerHit: number;
  totalDamage: number;
  triangleBonus: number;
  tagMultiplier: number;
}

/**
 * Returns whether an attack is magical (uses MAG vs RES)
 * vs physical (uses STR vs DEF).
 */
function isMagical(attackType: string): boolean {
  return attackType === "fire" || attackType === "wind" || attackType === "thunder";
}

/**
 * Collect all effects from the unit itself + equipped weapon.
 */
function gatherEffects(unit: UnitCard, weapon: WeaponCard | null): Effect[] {
  const effects = [...unit.effects];
  if (weapon) effects.push(...weapon.effects);
  return effects;
}

/**
 * Calculate the total stat boost from a weapon card.
 */
function getWeaponBoost(weapon: WeaponCard | null, stat: "str" | "mag"): number {
  if (!weapon) return 0;
  return weapon.statBoost[stat] ?? 0;
}

/**
 * Find the highest damage multiplier effect that applies to any of the
 * defender's tags. Returns 1 if none apply.
 */
function getTagMultiplier(effects: Effect[], defenderTags: UnitTag[]): number {
  let best = 1;
  for (const effect of effects) {
    if (
      effect.kind === "damage_multiplier_vs_tag" &&
      defenderTags.includes(effect.tag)
    ) {
      best = Math.max(best, effect.multiplier);
    }
  }
  return best;
}

/**
 * Check if the attacker has a double-attack effect.
 */
function hasDoubleAttack(effects: Effect[]): boolean {
  return effects.some((e) => e.kind === "double_attack");
}

/**
 * Returns the total pair_bonus amount for a given stat that applies to the unit's class.
 * A support's pair bonus applies to both classes in its pair requirement.
 */
export function getSupportStatBonus(
  unit: UnitCard,
  supports: SupportCard[],
  bothClassesOnField: (support: SupportCard) => boolean,
  stat: keyof Stats
): number {
  let total = 0;
  for (const support of supports) {
    if (!bothClassesOnField(support)) continue;
    const classMatches =
      unit.class === support.pairRequirement.classA ||
      unit.class === support.pairRequirement.classB;
    if (!classMatches) continue;
    for (const effect of support.effects) {
      if (effect.kind === "pair_bonus" && effect.stat === stat) {
        total += effect.amount;
      }
    }
  }
  return total;
}

/**
 * Core damage calculation.
 *
 * Physical: DMG = (STR + weaponBoost + triangleBonus) - DEF   (min 1)
 * Magical:  DMG = (MAG + weaponBoost + triangleBonus) - RES   (min 1)
 *
 * Then apply tag multiplier (e.g. 3x vs flying).
 * Then check for double attack.
 */
export interface DamageContext {
  attackerSupports?: SupportCard[];
  defenderSupports?: SupportCard[];
  isActiveSupport?: (support: SupportCard, side: "attacker" | "defender") => boolean;
}

export function calculateDamage(
  attacker: UnitCard,
  attackerWeapon: WeaponCard | null,
  defender: UnitCard,
  defenderWeapon: WeaponCard | null,
  ctx: DamageContext = {}
): DamageResult {
  const magical = isMagical(attacker.attackType);
  const effects = gatherEffects(attacker, attackerWeapon);

  // Attack type is always determined by the unit, not the weapon.
  // Weapons must be compatible with the unit's attack type (enforced in equipWeapon).
  const effectiveAttackType = attacker.attackType;
  const defenderAttackType = defender.attackType;

  // Triangle bonus
  const triangleBonus = getTriangleBonus(effectiveAttackType, defenderAttackType);

  // Support pair bonuses (optional context)
  const isAttackerSupportActive = ctx.isActiveSupport
    ? (s: SupportCard) => ctx.isActiveSupport!(s, "attacker")
    : () => true;
  const isDefenderSupportActive = ctx.isActiveSupport
    ? (s: SupportCard) => ctx.isActiveSupport!(s, "defender")
    : () => true;
  const attackerStrBonus = getSupportStatBonus(attacker, ctx.attackerSupports ?? [], isAttackerSupportActive, "str");
  const attackerMagBonus = getSupportStatBonus(attacker, ctx.attackerSupports ?? [], isAttackerSupportActive, "mag");
  const defenderDefBonus = getSupportStatBonus(defender, ctx.defenderSupports ?? [], isDefenderSupportActive, "def");
  const defenderResBonus = getSupportStatBonus(defender, ctx.defenderSupports ?? [], isDefenderSupportActive, "res");

  // Raw ATK and DEF
  const atk = magical
    ? attacker.stats.mag + getWeaponBoost(attackerWeapon, "mag") + triangleBonus + attackerMagBonus
    : attacker.stats.str + getWeaponBoost(attackerWeapon, "str") + triangleBonus + attackerStrBonus;

  const def = magical
    ? defender.stats.res + defenderResBonus
    : defender.stats.def + defenderDefBonus;

  // Base damage (minimum 1)
  const baseDamage = Math.max(1, atk - def);

  // Tag multiplier (e.g. archer vs flyer)
  const tagMultiplier = getTagMultiplier(effects, defender.tags);
  const damagePerHit = Math.floor(baseDamage * tagMultiplier);

  // Double attack check
  const hits = hasDoubleAttack(effects) ? 2 : 1;

  return {
    hits,
    damagePerHit,
    totalDamage: damagePerHit * hits,
    triangleBonus,
    tagMultiplier,
  };
}
