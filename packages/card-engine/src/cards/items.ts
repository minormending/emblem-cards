import type { ItemCard } from "@cards/shared";

export const items: ItemCard[] = [
  {
    type: "item",
    id: "vulnerary",
    name: "Vulnerary",
    effects: [{ kind: "heal_target", amount: 10 }],
    cost: 1,
    flavor: "A staple of every soldier's kit.",
  },
  {
    type: "item",
    id: "pure-water",
    name: "Pure Water",
    effects: [{ kind: "buff_target", stat: "res", amount: 5, duration: 2 }],
    cost: 1,
    flavor: "Blessed water that wards off magic.",
  },
  {
    type: "item",
    id: "energy-ring",
    name: "Energy Ring",
    effects: [{ kind: "buff_target", stat: "str", amount: 4, duration: 2 }],
    cost: 2,
    flavor: "Pulses with raw power.",
  },
];
