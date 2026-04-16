import { useEffect, useState } from "react";
import type { MatchStats } from "@cards/shared";
import { CardView } from "../CardView";

interface WinnerScreenProps {
  didWin: boolean;
  winnerName: string;
  turnCount: number;
  onBackToMenu: () => void;
  stats: MatchStats | null;
}

/**
 * End-of-match screen with a staggered reveal: headline → modifier → MVP →
 * stats → button. Each stage is a fixed delay so the total reveal is ~1.8s.
 * Tap anywhere to skip.
 */
export function WinnerScreen({ didWin, winnerName, turnCount, onBackToMenu, stats }: WinnerScreenProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Slice timings — each entry is ms since mount to reveal stage N.
    const schedule = [400, 800, 1200, 1700];
    const timers = schedule.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const skip = () => setStage(5);
  const gradient = didWin ? "from-amber-300 to-amber-500" : "from-gray-300 to-gray-500";
  const modifierInfo = stats ? MODIFIER_UI[stats.modifier ?? "none"] : null;

  return (
    <div
      onClick={skip}
      className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-gray-950 via-gray-900 to-black cursor-pointer px-6 py-10"
    >
      {/* Headline */}
      <div
        className={`transition-all duration-500 ${stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      >
        <div className={`text-7xl font-black tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {didWin ? "Victory" : "Defeat"}
        </div>
        <div className="text-center text-sm text-white/50 mt-1 font-semibold tracking-wide">{winnerName}</div>
      </div>

      {/* Modifier badge */}
      {modifierInfo && (
        <div
          className={`transition-all duration-500 ${stage >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
        >
          <div className={`text-xs font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border ${modifierInfo.className}`}>
            {modifierInfo.label}
          </div>
        </div>
      )}

      {/* MVP card */}
      {stats?.mvp && (
        <div
          className={`transition-all duration-500 ${stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">MVP</div>
            <CardView card={stats.mvp.unit} />
            <div className="text-sm text-white/70">
              <span className="text-amber-300 font-bold">{stats.mvp.totalDamage}</span> damage dealt
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div
        className={`transition-all duration-500 ${stage >= 4 ? "opacity-100" : "opacity-0"} grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/70 max-w-sm`}
      >
        {stats?.killingBlow && (
          <>
            <div className="text-white/40">Finishing blow</div>
            <div className="font-semibold text-right">
              {stats.killingBlow.attacker.name} → {stats.killingBlow.defender.name}
            </div>
          </>
        )}
        {stats?.biggestHit && (
          <>
            <div className="text-white/40">Biggest hit</div>
            <div className="font-semibold text-right">{stats.biggestHit.amount} dmg</div>
          </>
        )}
        <div className="text-white/40">Turns</div>
        <div className="font-semibold text-right">{turnCount}</div>
      </div>

      {/* Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onBackToMenu();
        }}
        className={`mt-4 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/20 ${
          stage >= 4 ? "opacity-100" : "opacity-0"
        }`}
      >
        Back to Menu
      </button>
    </div>
  );
}

const MODIFIER_UI: Record<string, { label: string; className: string }> = {
  flawless: {
    label: "Flawless",
    className: "bg-gradient-to-r from-amber-400/20 to-amber-500/20 text-amber-300 border-amber-400/50 shadow-lg shadow-amber-500/20",
  },
  comeback: {
    label: "Comeback",
    className: "bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-300 border-purple-400/50 shadow-lg shadow-purple-500/20",
  },
  close: {
    label: "Close",
    className: "bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-300 border-red-400/50 shadow-lg shadow-red-500/20",
  },
  dominant: {
    label: "Dominant",
    className: "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-orange-400/50",
  },
  methodical: {
    label: "Methodical",
    className: "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-400/50",
  },
};
