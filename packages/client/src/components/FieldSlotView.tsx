import type { FieldSlot, FieldPosition } from "@cards/shared";
import { attackTypeBorders } from "../lib/colors";
import { CardArtMini } from "./CardArt";
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
        flex flex-col items-center justify-center relative overflow-hidden
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

          <div className="w-full px-1 mt-1">
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

          {/* Stats */}
          <div className="flex gap-2 text-[11px] mt-1.5">
            <span className="text-red-400 font-bold">{unit.stats.hp} HP</span>
            <span className="text-orange-300">
              {unit.stats.str > 0 ? `${unit.stats.str} STR` : `${unit.stats.mag} MAG`}
            </span>
          </div>
          <div className="flex gap-2 text-[10px] opacity-70">
            <span className="text-blue-300">{unit.stats.def} DEF</span>
            <span className="text-purple-300">{unit.stats.res} RES</span>
            <span className="text-green-300">{unit.stats.spd} SPD</span>
          </div>

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
    </div>
  );
}
