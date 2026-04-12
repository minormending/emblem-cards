import type { SupportCard } from "@cards/shared";

export const supports: SupportCard[] = [
  {
    type: "support",
    id: "support-brothers",
    name: "Bond of Arms",
    pairRequirement: { classA: "Lord", classB: "Knight" },
    effects: [
      { kind: "pair_bonus", stat: "def", amount: 4 },
      { kind: "pair_bonus", stat: "str", amount: 2 },
    ],
    cost: 2,
    flavor: "He stands so the lord does not fall.",
  },
  {
    type: "support",
    id: "support-sky-sisters",
    name: "Wing Sisters",
    pairRequirement: { classA: "Pegasus Knight", classB: "Wyvern Rider" },
    effects: [
      { kind: "pair_bonus", stat: "spd", amount: 4 },
      { kind: "pair_bonus", stat: "str", amount: 2 },
    ],
    cost: 2,
    flavor: "Formation flying. Trust above the clouds.",
  },
  {
    type: "support",
    id: "support-medic",
    name: "Frontline Medic",
    pairRequirement: { classA: "Cleric", classB: "Knight" },
    effects: [
      { kind: "pair_bonus", stat: "def", amount: 2 },
      { kind: "heal_adjacent", amount: 3 },
    ],
    cost: 2,
    flavor: "Mend behind the wall.",
  },
];
