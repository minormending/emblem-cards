import type { FieldSlot, FieldPosition } from "@cards/shared";
import type { CombatPreview } from "@cards/battle-engine";
import { attackTypeBorders } from "../lib/colors";
import { CardArtMini } from "./CardArt";
import { CombatFx } from "./battle/CombatFx";
import { useGameStore } from "../store/gameStore";

interface FieldSlotViewProps {
  slot: FieldSlot;
  pos: FieldPosition;
  isOwn: boolean;
  isSelected: boolean;
  isDeployTarget: boolean;
  isAttackTarget: boolean;
  onClick: () => void;
  lastHit?: boolean;
  /** Damage preview when this slot is a legal attack target. */
  attackPreview?: CombatPreview | null;
}

export function FieldSlotView({
  slot,
  pos,
  isOwn,
  isSelected,
  isDeployTarget,
  isAttackTarget,
  onClick,
  lastHit,
  attackPreview,
}: FieldSlotViewProps) {
  const { unit, weapon, hasActed } = slot;
  const border = unit ? attackTypeBorders[unit.attackType] : "border-white/10";
  const setInspectedCard = useGameStore((s) => s.setInspectedCard);

  // Right-click an occupied slot to inspect the unit (works for own AND enemy).
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!unit) return;
    e.preventDefault();
    setInspectedCard(unit);
  };

  // HP bar — uses real maxHp from card data
  const hpPercent = unit
    ? Math.max(0, Math.min(100, (unit.stats.hp / unit.maxHp) * 100))
    : 0;
  const hpColor =
    hpPercent > 60 ? "bg-emerald-500" : hpPercent > 30 ? "bg-amber-500" : "bg-red-500";

  return (
    <div
      onClick={onClick}
      onContextMenu={handleContextMenu}
      title={unit ? "Right-click to inspect" : undefined}
      className={`
        w-36 h-40 rounded-xl border-2 ${border}
        flex flex-col items-center ${unit ? "justify-start pt-1.5 pb-1.5" : "justify-center"} relative overflow-hidden
        cursor-pointer transition-all duration-200 ease-out
        ${unit
          ? "bg-gradient-to-b from-gray-800 to-gray-900"
          : "bg-gray-900/40 border-dashed"
        }
        ${isSelected
          ? "ring-2 ring-mythic shadow-lg shadow-mythic/30 scale-105"
          : ""
        }
        ${isDeployTarget && !unit
          ? "border-emerald-400 bg-emerald-950/40 border-solid animate-pulse"
          : ""
        }
        ${isAttackTarget && unit
          ? "border-red-400 bg-red-950/30 border-solid"
          : ""
        }
        ${lastHit ? "animate-[shake_0.3s_ease-out]" : ""}
        ${!isOwn && unit ? "opacity-90" : ""}
        ${isOwn && unit && hasActed ? "opacity-50 saturate-50" : ""}
      `}
    >
      {unit ? (
        <>
          {/* HP bar across top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/40">
            <div
              className={`h-full ${hpColor} transition-all duration-300`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>

          <div className="flex-1 w-full px-1 min-h-0">
            <CardArtMini card={unit} />
          </div>
          <div className="text-sm font-bold truncate w-full text-center px-2">
            {unit.name}
          </div>
          {unit.isLord && (
            <span className="text-[9px] font-black tracking-wider bg-mythic/20 text-mythic border border-mythic/40 rounded px-1 py-px">
              LORD
            </span>
          )}

          {/* Stats — weapon.statBoost values are added to the base stat so
               the display matches what the engine uses in damage calc. */}
          {(() => {
            const boost = weapon?.statBoost ?? {};
            const b = (k: keyof typeof boost) => boost[k] ?? 0;
            const isMage = unit.stats.str === 0 && unit.stats.mag > 0;
            const atkStat = isMage ? "mag" : "str";
            const atkLabel = isMage ? "MAG" : "STR";
            const atkBase = isMage ? unit.stats.mag : unit.stats.str;
            const atkBoost = b(atkStat);
            return (
              <>
                <div className="flex gap-2 text-[11px] mt-1.5">
                  <span className="text-red-400 font-bold">{unit.stats.hp} HP</span>
                  <span className={atkBoost ? "text-amber-300 font-bold" : "text-orange-300"}>
                    {atkBase + atkBoost} {atkLabel}
                    {atkBoost ? <span className="text-[9px] opacity-80"> (+{atkBoost})</span> : null}
                  </span>
                </div>
                <div className="flex gap-2 text-[10px] opacity-70">
                  <StatChip color="text-blue-300" label="DEF" base={unit.stats.def} boost={b("def")} />
                  <StatChip color="text-purple-300" label="RES" base={unit.stats.res} boost={b("res")} />
                  <StatChip color="text-green-300" label="SPD" base={unit.stats.spd} boost={b("spd")} />
                </div>
              </>
            );
          })()}

          {/* Weapon badge */}
          {weapon && (
            <div className="mt-1 text-[10px] bg-emerald-900/60 border border-emerald-500/30 rounded-full px-2 py-0.5 text-emerald-300">
              {weapon.name}
            </div>
          )}

          {/* Acted indicator */}
          {isOwn && hasActed && (
            <div className="absolute top-1 left-1 text-[9px] bg-gray-700/80 text-gray-400 rounded px-1">
              Done
            </div>
          )}
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-lg border border-dashed border-white/10 flex items-center justify-center mb-1">
            <span className="text-white/15 text-lg">+</span>
          </div>
          <div className="text-[10px] opacity-20 capitalize">
            {pos.row} {pos.col + 1}
          </div>
        </>
      )}

      {attackPreview && <AttackPreviewBadge preview={attackPreview} />}

      <CombatFx side={isOwn ? "own" : "enemy"} pos={pos} />
    </div>
  );
}

/**
 * Tactical preview shown on each reachable enemy slot while an attacker is
 * selected. A split pill:
 *   ┌───────┬───────┐
 *   │ ↑ OUT │ ↓ IN  │   IN half hidden when no counter
 *   └───────┴───────┘
 *
 * Color tells the story of the exchange at a glance; a skull marks lethal
 * outcomes and a soft pulse draws the eye when the move would KO you.
 */
function AttackPreviewBadge({ preview }: { preview: CombatPreview }) {
  const { out, in: incoming, attackerKOs, counterKOs, counters } = preview;

  // Outcome → gradient class + dominant color
  let outTone: string;
  let inTone: string;
  let ringTone: string;
  let animate = "";

  if (attackerKOs) {
    // Clean kill — golden victory, subtle breathing animation
    outTone = "bg-gradient-to-b from-amber-300 to-amber-500 text-gray-950";
    inTone = "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white";
    ringTone = "ring-amber-300/70";
    animate = "animate-pulse";
  } else if (counterKOs) {
    // Lethal counter — strong red warning pulse
    outTone = "bg-gradient-to-b from-amber-400 to-amber-600 text-gray-950";
    inTone = "bg-gradient-to-b from-red-500 to-red-700 text-white";
    ringTone = "ring-red-400/80";
    animate = "animate-pulse";
  } else if (counters) {
    // Both survive — trade
    outTone = "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white";
    inTone = "bg-gradient-to-b from-red-400 to-red-600 text-white";
    ringTone = "ring-white/30";
  } else {
    // Free hit — no counter
    outTone = "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white";
    inTone = "";
    ringTone = "ring-emerald-300/60";
  }

  const titleText = attackerKOs
    ? `KO — you deal ${out}, no counter`
    : counterKOs
      ? `LETHAL — you deal ${out}, counter hits ${incoming}`
      : counters
        ? `Trade — you deal ${out}, take ${incoming}`
        : `Free hit — you deal ${out}, no counter`;

  return (
    <div
      className={`absolute top-1 left-1/2 -translate-x-1/2 z-10 flex rounded-lg overflow-hidden shadow-lg ring-2 ${ringTone} ${animate} backdrop-blur-sm`}
      title={titleText}
    >
      {/* Outgoing — your hit */}
      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[12px] font-black tabular-nums ${outTone}`}>
        <Chevron direction="up" />
        <span className="leading-none drop-shadow-sm">{out}</span>
        {attackerKOs && <SkullIcon />}
      </div>

      {/* Divider slash — only if both halves visible */}
      {counters && <div className="w-px bg-black/40" />}

      {/* Incoming — counter */}
      {counters && (
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[12px] font-black tabular-nums ${inTone}`}>
          <Chevron direction="down" />
          <span className="leading-none drop-shadow-sm">{incoming}</span>
          {counterKOs && <SkullIcon />}
        </div>
      )}
    </div>
  );
}

function Chevron({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      className={`drop-shadow ${direction === "down" ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M5 1 L9 8 L1 8 Z" fill="currentColor" />
    </svg>
  );
}

function SkullIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="drop-shadow"
      aria-hidden
    >
      <circle cx="5" cy="4" r="3" fill="currentColor" />
      <rect x="3" y="6" width="4" height="2" fill="currentColor" />
      <circle cx="3.7" cy="4" r="0.7" fill="rgba(0,0,0,0.5)" />
      <circle cx="6.3" cy="4" r="0.7" fill="rgba(0,0,0,0.5)" />
    </svg>
  );
}

function StatChip({
  color,
  label,
  base,
  boost,
}: {
  color: string;
  label: string;
  base: number;
  boost: number;
}) {
  const boosted = boost !== 0;
  return (
    <span className={boosted ? `${color} font-bold` : color}>
      {base + boost} {label}
      {boosted ? <span className="text-[9px] opacity-80"> (+{boost})</span> : null}
    </span>
  );
}
