import type { AttackType, WeaponType, MagicType } from "@cards/shared";

const WEAPON_ADVANTAGE: Record<WeaponType, WeaponType> = {
  sword: "axe",
  axe: "lance",
  lance: "sword",
};

const MAGIC_ADVANTAGE: Record<MagicType, MagicType> = {
  fire: "wind",
  wind: "thunder",
  thunder: "fire",
};

export const TRIANGLE_BONUS = 2;

/**
 * Returns the ATK bonus from the weapon/magic triangle.
 *  +TRIANGLE_BONUS if attacker has advantage
 *  0 otherwise (no penalty for disadvantage)
 */
export function getTriangleBonus(
  attackerType: AttackType,
  defenderType: AttackType
): number {
  // Bow is outside both triangles
  if (attackerType === "bow" || defenderType === "bow") return 0;

  // Weapon triangle
  if (
    attackerType in WEAPON_ADVANTAGE &&
    defenderType in WEAPON_ADVANTAGE
  ) {
    return WEAPON_ADVANTAGE[attackerType as WeaponType] === defenderType
      ? TRIANGLE_BONUS
      : 0;
  }

  // Magic triangle
  if (
    attackerType in MAGIC_ADVANTAGE &&
    defenderType in MAGIC_ADVANTAGE
  ) {
    return MAGIC_ADVANTAGE[attackerType as MagicType] === defenderType
      ? TRIANGLE_BONUS
      : 0;
  }

  // Cross-type (physical vs magic) — no triangle
  return 0;
}
