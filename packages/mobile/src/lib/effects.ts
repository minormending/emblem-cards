import type { Effect } from '@cards/shared';

export function effectLabel(effect: Effect): string {
  switch (effect.kind) {
    case 'damage_multiplier_vs_tag':
      return `${effect.multiplier}x vs ${effect.tag}`;
    case 'double_attack':
      return 'Attacks twice';
    case 'heal_adjacent':
      return `Heal adj. ${effect.amount} HP`;
    case 'heal_target':
      return `Heal ${effect.amount} HP`;
    case 'buff_target':
      return `+${effect.amount} ${effect.stat.toUpperCase()} (${effect.duration}t)`;
    case 'damage_target':
      return `Deal ${effect.amount} dmg`;
    case 'draw_cards':
      return `Draw ${effect.amount}`;
    case 'ranged':
      return 'Ranged';
    case 'flying':
      return 'Flying';
    case 'pair_bonus':
      return `Pair: +${effect.amount} ${effect.stat.toUpperCase()}`;
    case 'reposition':
      return 'Reposition';
  }
}
