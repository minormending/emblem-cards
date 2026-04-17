import type { Card } from "./types.js";

/**
 * Platform-agnostic description of the procedural card icon drawn behind
 * missing bitmap art. Each platform (web DOM SVG, react-native-svg) owns a
 * thin renderer that maps these primitives to its own element set.
 *
 * Conventions:
 *   - `fill` and `stroke` default to "white" when omitted but an opacity is set.
 *   - Coordinates are in a 100×80 viewBox; the `transform` positions and
 *     scales the shapes inside that viewBox.
 */

export interface IconTransform {
  x: number;
  y: number;
  scale: number;
}

export type IconShape =
  | {
      kind: "path";
      d: string;
      fill?: string;
      fillOpacity?: number;
      stroke?: string;
      strokeOpacity?: number;
      strokeWidth?: number;
    }
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      rx?: number;
      fill?: string;
      fillOpacity?: number;
    }
  | {
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      fillOpacity?: number;
      stroke?: string;
      strokeOpacity?: number;
      strokeWidth?: number;
      strokeDasharray?: string;
    }
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      strokeOpacity?: number;
      strokeWidth?: number;
    }
  | {
      kind: "polygon";
      points: string;
      fill?: string;
      fillOpacity?: number;
    }
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill?: string;
      fillOpacity?: number;
    };

export interface CardIcon {
  transform: IconTransform;
  shapes: IconShape[];
}

const unitFlying: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "path", d: "M50 20 L30 50 L10 40 L25 55 L15 80 L35 65 L50 85 L65 65 L85 80 L75 55 L90 40 L70 50 Z", fillOpacity: 0.25 },
    { kind: "path", d: "M50 35 L42 55 L50 75 L58 55 Z", fillOpacity: 0.15 },
  ],
};

const unitArmored: CardIcon = {
  transform: { x: 24, y: 18, scale: 0.52 },
  shapes: [
    { kind: "rect", x: 25, y: 15, width: 50, height: 60, rx: 5, fillOpacity: 0.2 },
    { kind: "rect", x: 30, y: 20, width: 40, height: 25, rx: 3, fillOpacity: 0.1 },
    { kind: "rect", x: 35, y: 50, width: 30, height: 20, rx: 2, fillOpacity: 0.1 },
    { kind: "circle", cx: 50, cy: 32, r: 6, fillOpacity: 0.15 },
  ],
};

const unitCleric: CardIcon = {
  transform: { x: 24, y: 18, scale: 0.52 },
  shapes: [
    { kind: "rect", x: 44, y: 20, width: 12, height: 55, rx: 2, fillOpacity: 0.2 },
    { kind: "rect", x: 30, y: 35, width: 40, height: 12, rx: 2, fillOpacity: 0.2 },
  ],
};

const unitMage: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "circle", cx: 50, cy: 30, r: 15, fillOpacity: 0.15 },
    { kind: "circle", cx: 50, cy: 30, r: 8, fillOpacity: 0.2 },
    { kind: "path", d: "M50 45 L40 80 L50 75 L60 80 Z", fillOpacity: 0.15 },
    { kind: "circle", cx: 35, cy: 25, r: 3, fillOpacity: 0.25 },
    { kind: "circle", cx: 65, cy: 25, r: 3, fillOpacity: 0.25 },
    { kind: "circle", cx: 50, cy: 15, r: 3, fillOpacity: 0.25 },
  ],
};

const unitThief: CardIcon = {
  transform: { x: 24, y: 18, scale: 0.52 },
  shapes: [
    { kind: "circle", cx: 50, cy: 25, r: 10, fillOpacity: 0.15 },
    { kind: "path", d: "M40 35 L35 70 L50 60 L65 70 L60 35 Z", fillOpacity: 0.15 },
    { kind: "path", d: "M55 30 L75 20 L70 28 L78 25 L65 35", fill: "none", strokeOpacity: 0.25, strokeWidth: 2 },
  ],
};

const unitArcher: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "path", d: "M30 75 C30 30, 70 30, 70 75", fill: "none", strokeOpacity: 0.25, strokeWidth: 3 },
    { kind: "line", x1: 50, y1: 20, x2: 50, y2: 75, strokeOpacity: 0.2, strokeWidth: 2 },
    { kind: "polygon", points: "50,15 46,25 54,25", fillOpacity: 0.3 },
  ],
};

const unitSwordmaster: CardIcon = {
  transform: { x: 24, y: 14, scale: 0.52 },
  shapes: [
    { kind: "line", x1: 50, y1: 10, x2: 50, y2: 70, strokeOpacity: 0.3, strokeWidth: 3 },
    { kind: "line", x1: 40, y1: 68, x2: 60, y2: 68, strokeOpacity: 0.25, strokeWidth: 3 },
    { kind: "circle", cx: 50, cy: 40, r: 12, fill: "none", strokeOpacity: 0.15, strokeWidth: 1.5, strokeDasharray: "4 3" },
    { kind: "circle", cx: 50, cy: 40, r: 20, fill: "none", strokeOpacity: 0.1, strokeWidth: 1, strokeDasharray: "4 3" },
  ],
};

const unitBerserker: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "path", d: "M30 25 L50 75 L70 25", fill: "none", strokeOpacity: 0.3, strokeWidth: 4 },
    { kind: "line", x1: 25, y1: 25, x2: 75, y2: 25, strokeOpacity: 0.2, strokeWidth: 3 },
    { kind: "circle", cx: 50, cy: 45, r: 8, fillOpacity: 0.1 },
  ],
};

const unitDefault: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "circle", cx: 50, cy: 25, r: 12, fillOpacity: 0.15 },
    { kind: "path", d: "M38 37 L30 75 L50 65 L70 75 L62 37 Z", fillOpacity: 0.15 },
    { kind: "line", x1: 50, y1: 5, x2: 50, y2: 25, strokeOpacity: 0.1, strokeWidth: 1 },
  ],
};

const weaponSword: CardIcon = {
  transform: { x: 24, y: 14, scale: 0.52 },
  shapes: [
    { kind: "line", x1: 50, y1: 10, x2: 50, y2: 65, strokeOpacity: 0.3, strokeWidth: 3 },
    { kind: "line", x1: 38, y1: 60, x2: 62, y2: 60, strokeOpacity: 0.25, strokeWidth: 4 },
    { kind: "polygon", points: "50,10 46,18 54,18", fillOpacity: 0.25 },
  ],
};

const weaponAxe: CardIcon = {
  transform: { x: 24, y: 14, scale: 0.52 },
  shapes: [
    { kind: "line", x1: 50, y1: 20, x2: 50, y2: 80, strokeOpacity: 0.2, strokeWidth: 3 },
    { kind: "path", d: "M30 20 Q50 35 50 20 Q50 35 70 20 L60 40 L40 40 Z", fillOpacity: 0.25 },
  ],
};

const weaponLance: CardIcon = {
  transform: { x: 24, y: 12, scale: 0.52 },
  shapes: [
    { kind: "line", x1: 50, y1: 15, x2: 50, y2: 85, strokeOpacity: 0.2, strokeWidth: 2.5 },
    { kind: "polygon", points: "50,10 42,30 58,30", fillOpacity: 0.3 },
  ],
};

const weaponBow: CardIcon = {
  transform: { x: 24, y: 14, scale: 0.52 },
  shapes: [
    { kind: "path", d: "M35 75 C35 30, 65 30, 65 75", fill: "none", strokeOpacity: 0.25, strokeWidth: 3 },
    { kind: "line", x1: 35, y1: 75, x2: 65, y2: 75, strokeOpacity: 0.15, strokeWidth: 1.5 },
  ],
};

const weaponTome: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "rect", x: 30, y: 15, width: 40, height: 55, rx: 3, fillOpacity: 0.15 },
    { kind: "rect", x: 34, y: 20, width: 32, height: 45, rx: 2, fillOpacity: 0.08 },
    { kind: "circle", cx: 50, cy: 42, r: 10, fillOpacity: 0.15 },
    { kind: "circle", cx: 50, cy: 42, r: 5, fillOpacity: 0.2 },
  ],
};

const itemIcon: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "ellipse", cx: 50, cy: 50, rx: 18, ry: 22, fillOpacity: 0.15 },
    { kind: "ellipse", cx: 50, cy: 28, rx: 10, ry: 6, fillOpacity: 0.2 },
    { kind: "line", x1: 50, y1: 34, x2: 50, y2: 45, strokeOpacity: 0.1, strokeWidth: 8 },
  ],
};

const supportIcon: CardIcon = {
  transform: { x: 24, y: 18, scale: 0.52 },
  shapes: [
    { kind: "circle", cx: 35, cy: 40, r: 14, fillOpacity: 0.15 },
    { kind: "circle", cx: 65, cy: 40, r: 14, fillOpacity: 0.15 },
    { kind: "path", d: "M42 35 L58 35 L55 50 L50 55 L45 50 Z", fillOpacity: 0.2 },
  ],
};

const tacticIcon: CardIcon = {
  transform: { x: 24, y: 16, scale: 0.52 },
  shapes: [
    { kind: "polygon", points: "50,12 58,38 85,38 63,55 72,82 50,65 28,82 37,55 15,38 42,38", fillOpacity: 0.15 },
    { kind: "polygon", points: "50,25 55,38 68,38 57,47 61,60 50,52 39,60 43,47 32,38 45,38", fillOpacity: 0.1 },
  ],
};

export function getCardIcon(card: Card): CardIcon {
  if (card.type === "unit") {
    if (card.tags.includes("flying")) return unitFlying;
    if (card.tags.includes("armored")) return unitArmored;
    switch (card.class) {
      case "Cleric":
        return unitCleric;
      case "Mage":
        return unitMage;
      case "Thief":
        return unitThief;
      case "Archer":
        return unitArcher;
      case "Swordmaster":
        return unitSwordmaster;
      case "Berserker":
        return unitBerserker;
    }
    return unitDefault;
  }
  if (card.type === "weapon") {
    switch (card.attackType) {
      case "sword":
        return weaponSword;
      case "axe":
        return weaponAxe;
      case "lance":
        return weaponLance;
      case "bow":
        return weaponBow;
    }
    return weaponTome;
  }
  if (card.type === "item") return itemIcon;
  if (card.type === "support") return supportIcon;
  return tacticIcon;
}
