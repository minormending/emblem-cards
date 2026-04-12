import type { TacticCard } from "@cards/shared";

export const tactics: TacticCard[] = [
  {
    type: "tactic",
    id: "tactic-rally",
    name: "Rally",
    effects: [{ kind: "buff_target", stat: "str", amount: 4, duration: 1 }],
    cost: 1,
    flavor: "Steel yourselves! One last push!",
  },
  {
    type: "tactic",
    id: "tactic-bolting",
    name: "Bolting",
    effects: [{ kind: "damage_target", amount: 8 }],
    cost: 4,
    flavor: "Lightning from the horizon. Nowhere is safe.",
  },
  {
    type: "tactic",
    id: "tactic-convoy",
    name: "Convoy",
    effects: [{ kind: "draw_cards", amount: 2 }],
    cost: 2,
    flavor: "Supplies from the rear. Just in time.",
  },
  {
    type: "tactic",
    id: "tactic-rescue",
    name: "Rescue",
    effects: [{ kind: "reposition", from: { row: "front", col: 0 }, to: { row: "back", col: 0 } }],
    cost: 1,
    flavor: "Pull them back before the killing blow.",
  },
];
