import type { Card, UnitCard, WeaponCard, ItemCard, SupportCard, TacticCard } from "@cards/shared";
import { attackTypeBorders, attackTypeLabels } from "../lib/colors";
import { effectLabel } from "../lib/effects";
import { CardArt } from "./CardArt";
import { useGameStore } from "../store/gameStore";

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  disabled?: boolean;
  energyShort?: number; // how much energy the player is short (0 = affordable)
}

function CostBadge({ cost, small }: { cost: number; small?: boolean }) {
  const size = small ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-sm";
  return (
    <div
      className={`${size} absolute top-1.5 right-1.5 rounded-full bg-amber-500 text-gray-900 font-black flex items-center justify-center shadow-md`}
    >
      {cost}
    </div>
  );
}

function LordBadge() {
  return (
    <span className="inline-block text-[10px] font-black tracking-wider bg-mythic/20 text-mythic border border-mythic/40 rounded px-1.5 py-0.5">
      LORD
    </span>
  );
}

function EffectsBlock({ effects }: { effects: { kind: string }[] }) {
  if (effects.length === 0) return null;
  return (
    <div className="space-y-0.5 mt-1">
      {(effects as UnitCard["effects"]).map((e, i) => (
        <div key={i} className="text-[11px] leading-tight text-amber-300 flex items-start gap-1">
          <span className="text-amber-500 mt-px">*</span>
          <span>{effectLabel(e)}</span>
        </div>
      ))}
    </div>
  );
}

function StatGrid({ stats, compact }: { stats: UnitCard["stats"]; compact?: boolean }) {
  const items = [
    { label: "HP", value: stats.hp, color: "text-red-400" },
    { label: "STR", value: stats.str, color: "text-orange-300" },
    { label: "MAG", value: stats.mag, color: "text-violet-300" },
    { label: "DEF", value: stats.def, color: "text-blue-300" },
    { label: "RES", value: stats.res, color: "text-purple-300" },
    { label: "SPD", value: stats.spd, color: "text-green-300" },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px]">
        {items.map((s) => (
          <span key={s.label} className={s.color}>
            {s.label} <span className="font-bold">{s.value}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs bg-black/20 rounded p-1.5">
      {items.map((s) => (
        <div key={s.label} className={`${s.color} flex justify-between`}>
          <span className="opacity-60">{s.label}</span>
          <span className="font-bold">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex gap-1 mt-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-[10px] font-medium bg-white/10 border border-white/10 rounded-full px-2 py-0.5 capitalize"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function UnitCardBody({ card, small }: { card: UnitCard; small?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] opacity-50 uppercase tracking-wide">{card.class}</span>
        <span className="text-[10px] opacity-50">{attackTypeLabels[card.attackType]}</span>
      </div>
      <div className={`${small ? "text-sm" : "text-base"} font-bold leading-tight`}>
        {card.name}
      </div>
      {card.isLord && <div className="mt-1"><LordBadge /></div>}
      <div className="mt-1.5">
        <StatGrid stats={card.stats} compact={small} />
      </div>
      <TagPills tags={card.tags} />
      <EffectsBlock effects={card.effects} />
    </>
  );
}

function WeaponCardBody({ card, small }: { card: WeaponCard; small?: boolean }) {
  const boosts = Object.entries(card.statBoost)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => `+${v} ${k.toUpperCase()}`);

  return (
    <>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] opacity-50 uppercase tracking-wide">Weapon</span>
        <span className="text-[10px] opacity-50">{attackTypeLabels[card.attackType]}</span>
      </div>
      <div className={`${small ? "text-sm" : "text-base"} font-bold leading-tight`}>
        {card.name}
      </div>
      <div className="text-sm text-emerald-300 font-semibold mt-1">{boosts.join(", ")}</div>
      <EffectsBlock effects={card.effects} />
    </>
  );
}

function SimpleCardBody({ card, label, small }: { card: ItemCard | TacticCard; label: string; small?: boolean }) {
  return (
    <>
      <div className="text-[10px] opacity-50 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`${small ? "text-sm" : "text-base"} font-bold leading-tight`}>
        {card.name}
      </div>
      <EffectsBlock effects={card.effects} />
    </>
  );
}

function SupportCardBody({ card, small }: { card: SupportCard; small?: boolean }) {
  return (
    <>
      <div className="text-[10px] opacity-50 uppercase tracking-wide mb-0.5">Support</div>
      <div className={`${small ? "text-sm" : "text-base"} font-bold leading-tight`}>
        {card.name}
      </div>
      <div className="text-[11px] text-sky-300 mt-1 bg-sky-500/10 rounded px-1.5 py-0.5 inline-block">
        {card.pairRequirement.classA === card.pairRequirement.classB
          ? `2× ${card.pairRequirement.classA}`
          : `${card.pairRequirement.classA} or ${card.pairRequirement.classB}`}
      </div>
      <EffectsBlock effects={card.effects} />
    </>
  );
}

function getCardBorder(card: Card): string {
  if (card.type === "unit") return attackTypeBorders[card.attackType];
  if (card.type === "weapon") return attackTypeBorders[card.attackType];
  if (card.type === "support") return "border-sky-500/60";
  if (card.type === "item") return "border-emerald-500/60";
  return "border-purple-500/60";
}

function getCardBg(card: Card): string {
  if (card.type === "unit") return "bg-gradient-to-b from-gray-800 to-gray-900";
  if (card.type === "weapon") return "bg-gradient-to-b from-gray-800/90 to-gray-900/90";
  if (card.type === "support") return "bg-gradient-to-b from-sky-950 to-gray-900";
  if (card.type === "item") return "bg-gradient-to-b from-emerald-950 to-gray-900";
  return "bg-gradient-to-b from-purple-950 to-gray-900";
}

export function CardView({ card, onClick, selected, small, disabled, energyShort }: CardViewProps) {
  const setInspectedCard = useGameStore((s) => s.setInspectedCard);
  const border = getCardBorder(card);
  const bg = getCardBg(card);
  const width = small ? "w-36" : "w-48";
  const padding = small ? "p-2 pt-3" : "p-3 pt-4";

  const inspect = () => setInspectedCard(card);

  // Disabled cards open the inspector on click. Playable cards run onClick.
  // Right-click always inspects, regardless of state.
  const handleClick = disabled ? inspect : onClick;
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    inspect();
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`
        ${width} ${padding} ${bg} ${border}
        relative border-2 rounded-xl select-none group
        transition-all duration-200 ease-out
        ${disabled
          ? "opacity-40 grayscale-[30%] cursor-help"
          : "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40"
        }
        ${selected ? "ring-2 ring-mythic ring-offset-1 ring-offset-gray-900 -translate-y-1 shadow-lg shadow-mythic/20" : ""}
      `}
      title={disabled ? "Click to inspect" : "Right-click to inspect"}
    >
      <CostBadge cost={card.cost} small={small} />

      <div className={small ? "mb-1.5 -mx-0.5" : "mb-2 -mx-1"}>
        <CardArt card={card} height={small ? 48 : 72} />
      </div>

      {card.type === "unit" && <UnitCardBody card={card} small={small} />}
      {card.type === "weapon" && <WeaponCardBody card={card} small={small} />}
      {card.type === "item" && <SimpleCardBody card={card} label="Item" small={small} />}
      {card.type === "tactic" && <SimpleCardBody card={card} label="Tactic" small={small} />}
      {card.type === "support" && <SupportCardBody card={card} small={small} />}

      {card.flavor && !small && (
        <div className="text-[10px] italic opacity-25 mt-2 leading-tight">{card.flavor}</div>
      )}

      {energyShort != null && energyShort > 0 && (
        <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold text-red-400 bg-black/70 rounded px-2 py-0.5">
            Need {energyShort} more energy
          </span>
        </div>
      )}
    </div>
  );
}
