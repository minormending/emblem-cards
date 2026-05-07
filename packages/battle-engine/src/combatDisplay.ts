import type { UnitCard, WeaponCard } from "@cards/shared";
import { isMagicalType } from "./field.js";

export interface UnitCombatStats {
  hp: number;
  atkLabel: "STR" | "MAG";
  atkBase: number;
  atkBoost: number;
  def: number;
  defBoost: number;
  res: number;
  resBoost: number;
  spd: number;
  spdBoost: number;
}

/**
 * Compute the displayed combat stats for a deployed unit, folding in weapon
 * boosts. Attack stat is chosen by the unit's attackType (not by raw stat
 * values), matching the damage engine. STR/MAG on a weapon are treated as
 * interchangeable attack-stat labels — a sword's "+2 STR" still pumps MAG on
 * a magical wielder, mirroring getWeaponBoost() in damage.ts.
 */
export function getUnitCombatStats(
  unit: UnitCard,
  weapon: WeaponCard | null,
): UnitCombatStats {
  const b = weapon?.statBoost ?? {};
  const get = (k: "str" | "mag" | "def" | "res" | "spd") => b[k] ?? 0;

  const magical = isMagicalType(unit.attackType);
  const atkLabel = magical ? "MAG" : "STR";
  const atkBase = magical ? unit.stats.mag : unit.stats.str;
  const primaryBoost = magical ? get("mag") : get("str");
  const atkBoost = primaryBoost || (magical ? get("str") : get("mag"));

  return {
    hp: unit.stats.hp,
    atkLabel,
    atkBase,
    atkBoost,
    def: unit.stats.def,
    defBoost: get("def"),
    res: unit.stats.res,
    resBoost: get("res"),
    spd: unit.stats.spd,
    spdBoost: get("spd"),
  };
}
