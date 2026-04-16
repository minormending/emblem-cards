import { useId } from "react";
import type { Card, AttackType } from "@cards/shared";

const attackTypeGradients: Record<AttackType, [string, string]> = {
  sword: ["#991b1b", "#450a0a"],
  axe: ["#166534", "#052e16"],
  lance: ["#1e40af", "#172554"],
  bow: ["#854d0e", "#422006"],
  fire: ["#c2410c", "#7c2d12"],
  wind: ["#047857", "#064e3b"],
  thunder: ["#6d28d9", "#3b0764"],
};

const typeGradients: Record<string, [string, string]> = {
  item: ["#065f46", "#022c22"],
  support: ["#0c4a6e", "#082f49"],
  tactic: ["#581c87", "#3b0764"],
};

function getGradient(card: Card): [string, string] {
  if (card.type === "unit" || card.type === "weapon") {
    return attackTypeGradients[card.attackType];
  }
  return typeGradients[card.type] ?? ["#374151", "#111827"];
}

// Simple symbolic icons as SVG paths
function UnitIcon({ card }: { card: Extract<Card, { type: "unit" }> }) {
  // Different silhouettes based on class/tags
  if (card.tags.includes("flying")) {
    return (
      <g transform="translate(24, 16) scale(0.52)">
        <path d="M50 20 L30 50 L10 40 L25 55 L15 80 L35 65 L50 85 L65 65 L85 80 L75 55 L90 40 L70 50 Z" fill="white" fillOpacity="0.25" />
        <path d="M50 35 L42 55 L50 75 L58 55 Z" fill="white" fillOpacity="0.15" />
      </g>
    );
  }
  if (card.tags.includes("armored")) {
    return (
      <g transform="translate(24, 18) scale(0.52)">
        <rect x="25" y="15" width="50" height="60" rx="5" fill="white" fillOpacity="0.2" />
        <rect x="30" y="20" width="40" height="25" rx="3" fill="white" fillOpacity="0.1" />
        <rect x="35" y="50" width="30" height="20" rx="2" fill="white" fillOpacity="0.1" />
        <circle cx="50" cy="32" r="6" fill="white" fillOpacity="0.15" />
      </g>
    );
  }
  if (card.class === "Cleric") {
    return (
      <g transform="translate(24, 18) scale(0.52)">
        <rect x="44" y="20" width="12" height="55" rx="2" fill="white" fillOpacity="0.2" />
        <rect x="30" y="35" width="40" height="12" rx="2" fill="white" fillOpacity="0.2" />
      </g>
    );
  }
  if (card.class === "Mage") {
    return (
      <g transform="translate(24, 16) scale(0.52)">
        <circle cx="50" cy="30" r="15" fill="white" fillOpacity="0.15" />
        <circle cx="50" cy="30" r="8" fill="white" fillOpacity="0.2" />
        <path d="M50 45 L40 80 L50 75 L60 80 Z" fill="white" fillOpacity="0.15" />
        <circle cx="35" cy="25" r="3" fill="white" fillOpacity="0.25" />
        <circle cx="65" cy="25" r="3" fill="white" fillOpacity="0.25" />
        <circle cx="50" cy="15" r="3" fill="white" fillOpacity="0.25" />
      </g>
    );
  }
  if (card.class === "Thief") {
    return (
      <g transform="translate(24, 18) scale(0.52)">
        <circle cx="50" cy="25" r="10" fill="white" fillOpacity="0.15" />
        <path d="M40 35 L35 70 L50 60 L65 70 L60 35 Z" fill="white" fillOpacity="0.15" />
        <path d="M55 30 L75 20 L70 28 L78 25 L65 35" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
      </g>
    );
  }
  if (card.class === "Archer") {
    return (
      <g transform="translate(24, 16) scale(0.52)">
        <path d="M30 75 C30 30, 70 30, 70 75" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="3" />
        <line x1="50" y1="20" x2="50" y2="75" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
        <polygon points="50,15 46,25 54,25" fill="white" fillOpacity="0.3" />
      </g>
    );
  }
  if (card.class === "Swordmaster") {
    return (
      <g transform="translate(24, 14) scale(0.52)">
        <line x1="50" y1="10" x2="50" y2="70" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
        <line x1="40" y1="68" x2="60" y2="68" stroke="white" strokeOpacity="0.25" strokeWidth="3" />
        <circle cx="50" cy="40" r="12" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" strokeDasharray="4 3" />
        <circle cx="50" cy="40" r="20" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 3" />
      </g>
    );
  }
  if (card.class === "Berserker") {
    return (
      <g transform="translate(24, 16) scale(0.52)">
        <path d="M30 25 L50 75 L70 25" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="4" />
        <line x1="25" y1="25" x2="75" y2="25" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
        <circle cx="50" cy="45" r="8" fill="white" fillOpacity="0.1" />
      </g>
    );
  }
  // Default: sword/lord silhouette
  return (
    <g transform="translate(24, 16) scale(0.52)">
      <circle cx="50" cy="25" r="12" fill="white" fillOpacity="0.15" />
      <path d="M38 37 L30 75 L50 65 L70 75 L62 37 Z" fill="white" fillOpacity="0.15" />
      <line x1="50" y1="5" x2="50" y2="25" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
    </g>
  );
}

function WeaponIcon({ card }: { card: Extract<Card, { type: "weapon" }> }) {
  const at = card.attackType;
  if (at === "sword") {
    return (
      <g transform="translate(24, 14) scale(0.52)">
        <line x1="50" y1="10" x2="50" y2="65" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
        <line x1="38" y1="60" x2="62" y2="60" stroke="white" strokeOpacity="0.25" strokeWidth="4" />
        <polygon points="50,10 46,18 54,18" fill="white" fillOpacity="0.25" />
      </g>
    );
  }
  if (at === "axe") {
    return (
      <g transform="translate(24, 14) scale(0.52)">
        <line x1="50" y1="20" x2="50" y2="80" stroke="white" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M30 20 Q50 35 50 20 Q50 35 70 20 L60 40 L40 40 Z" fill="white" fillOpacity="0.25" />
      </g>
    );
  }
  if (at === "lance") {
    return (
      <g transform="translate(24, 12) scale(0.52)">
        <line x1="50" y1="15" x2="50" y2="85" stroke="white" strokeOpacity="0.2" strokeWidth="2.5" />
        <polygon points="50,10 42,30 58,30" fill="white" fillOpacity="0.3" />
      </g>
    );
  }
  if (at === "bow") {
    return (
      <g transform="translate(24, 14) scale(0.52)">
        <path d="M35 75 C35 30, 65 30, 65 75" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="3" />
        <line x1="35" y1="75" x2="65" y2="75" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
      </g>
    );
  }
  // Tomes (fire/wind/thunder)
  return (
    <g transform="translate(24, 16) scale(0.52)">
      <rect x="30" y="15" width="40" height="55" rx="3" fill="white" fillOpacity="0.15" />
      <rect x="34" y="20" width="32" height="45" rx="2" fill="white" fillOpacity="0.08" />
      <circle cx="50" cy="42" r="10" fill="white" fillOpacity="0.15" />
      <circle cx="50" cy="42" r="5" fill="white" fillOpacity="0.2" />
    </g>
  );
}

function ItemIcon() {
  return (
    <g transform="translate(24, 16) scale(0.52)">
      <ellipse cx="50" cy="50" rx="18" ry="22" fill="white" fillOpacity="0.15" />
      <ellipse cx="50" cy="28" rx="10" ry="6" fill="white" fillOpacity="0.2" />
      <line x1="50" y1="34" x2="50" y2="45" stroke="white" strokeOpacity="0.1" strokeWidth="8" />
    </g>
  );
}

function SupportIcon() {
  return (
    <g transform="translate(24, 18) scale(0.52)">
      <circle cx="35" cy="40" r="14" fill="white" fillOpacity="0.15" />
      <circle cx="65" cy="40" r="14" fill="white" fillOpacity="0.15" />
      <path d="M42 35 L58 35 L55 50 L50 55 L45 50 Z" fill="white" fillOpacity="0.2" />
    </g>
  );
}

function TacticIcon() {
  return (
    <g transform="translate(24, 16) scale(0.52)">
      <polygon points="50,12 58,38 85,38 63,55 72,82 50,65 28,82 37,55 15,38 42,38" fill="white" fillOpacity="0.15" />
      <polygon points="50,25 55,38 68,38 57,47 61,60 50,52 39,60 43,47 32,38 45,38" fill="white" fillOpacity="0.1" />
    </g>
  );
}

interface CardArtProps {
  card: Card;
  height?: number;
}

export function CardArt({ card, height = 72 }: CardArtProps) {
  const [from, to] = getGradient(card);
  // Stable, unique id per render — prevents SVG id collisions when the same
  // card appears multiple times on the field.
  const uid = useId().replace(/:/g, "");
  const gradId = `grad-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <svg
      viewBox="0 0 100 80"
      className="w-full rounded-lg overflow-hidden"
      style={{ height }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="80" fill={`url(#${gradId})`} />

      {card.art ? (
        <image
          href={card.art}
          x="0"
          y="0"
          width="100"
          height="80"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <>
          {card.type === "unit" && <UnitIcon card={card} />}
          {card.type === "weapon" && <WeaponIcon card={card} />}
          {card.type === "item" && <ItemIcon />}
          {card.type === "support" && <SupportIcon />}
          {card.type === "tactic" && <TacticIcon />}
        </>
      )}

      <rect width="100" height="80" fill={`url(#${glowId})`} />
    </svg>
  );
}

/** Compact version for field slots */
export function CardArtMini({ card }: { card: Extract<Card, { type: "unit" }> }) {
  const [from, to] = getGradient(card);
  const uid = useId().replace(/:/g, "");
  const gradId = `mgrad-${uid}`;

  return (
    <svg viewBox="0 0 100 80" className="w-full h-8 rounded overflow-hidden" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="100" height="80" fill={`url(#${gradId})`} />
      {card.art ? (
        <image
          href={card.art}
          x="0"
          y="0"
          width="100"
          height="80"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <UnitIcon card={card} />
      )}
    </svg>
  );
}
