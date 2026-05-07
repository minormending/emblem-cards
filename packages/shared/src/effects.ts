import type { Effect } from "./types.js";

export function effectLabel(effect: Effect): string {
  switch (effect.kind) {
    case "damage_multiplier_vs_tag":
      return `${effect.multiplier}x vs ${effect.tag}`;
    case "double_attack":
      return "Attacks twice";
    case "heal_adjacent":
      return `Heal adj. ${effect.amount} HP`;
    case "heal_target":
      return `Heal ${effect.amount} HP`;
    case "buff_target":
      return `+${effect.amount} ${effect.stat.toUpperCase()} (${effect.duration}t)`;
    case "damage_target":
      return `Deal ${effect.amount} dmg`;
    case "draw_cards":
      return `Draw ${effect.amount}`;
    case "ranged":
      return "Ranged — hits from back row";
    case "flying":
      return "Flying — moves freely, weak to bows";
    case "riposte":
      return "Riposte — counters all attacks";
    case "pierce":
      return "Pierce — ignores 50% DEF";
    case "shatter":
      return `Shatter — removes ${effect.amount} DEF on hit`;
    case "suppress":
      return `Suppress — removes ${effect.amount} ATK on hit`;
    case "pair_bonus":
      return `Pair: +${effect.amount} ${effect.stat.toUpperCase()}`;
    case "reposition":
      return "Reposition — swap front/back";
  }
}
