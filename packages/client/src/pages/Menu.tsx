import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { getDisplayName, setDisplayName, getPlayerId } from "../lib/identity";
import { hasSeenTutorial, markTutorialSeen, resetTutorial } from "../lib/firstTime";
import { getStats } from "../lib/stats";
import { HowToPlay } from "../components/HowToPlay";

export function Menu() {
  const { setScreen } = useGameStore();
  const [name, setName] = useState(getDisplayName());
  const [editingName, setEditingName] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const stats = getStats();
  const totalGames = stats.ai.wins + stats.ai.losses + stats.local.wins + stats.local.losses + stats.online.wins + stats.online.losses;
  const totalWins = stats.ai.wins + stats.local.wins + stats.online.wins;
  const totalLosses = stats.ai.losses + stats.local.losses + stats.online.losses;

  useEffect(() => {
    if (!hasSeenTutorial()) setShowTutorial(true);
  }, []);

  function closeTutorial() {
    markTutorialSeen();
    setShowTutorial(false);
  }

  function commitName(value: string) {
    const clean = value.trim().slice(0, 20);
    if (clean) {
      setDisplayName(clean);
      setName(clean);
    }
    setEditingName(false);
  }

  const playerId = getPlayerId();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-gray-950 to-black">
      {showTutorial && <HowToPlay onClose={closeTutorial} />}

      {/* Title */}
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-red-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Emblem Cards
        </h1>
        <p className="text-sm text-white/30">Tactical card battles on a 2×3 grid</p>
      </div>

      {/* Identity card — larger, front and center */}
      <div className="w-72 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center text-gray-900 font-black text-2xl">
          {name.charAt(0).toUpperCase()}
        </div>

        {editingName ? (
          <input
            autoFocus
            defaultValue={name}
            maxLength={20}
            onBlur={(e) => commitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setEditingName(false);
            }}
            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-center text-sm text-white outline-none focus:border-amber-400"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-center group"
          >
            <div className="text-lg font-bold">{name}</div>
            <div className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors">
              tap to edit
            </div>
          </button>
        )}

        {totalGames > 0 ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400 font-bold">{totalWins}W</span>
            <span className="text-white/20">–</span>
            <span className="text-red-400 font-bold">{totalLosses}L</span>
          </div>
        ) : (
          <div className="text-xs text-white/25 font-mono">{playerId.slice(0, 8)}</div>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={() => setScreen("mode-select")}
        className="w-72 py-5 bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 rounded-xl font-black text-xl transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]"
      >
        Play
      </button>

      {/* Bottom links */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => { resetTutorial(); setShowTutorial(true); }}
          className="text-xs text-white/40 hover:text-amber-400 transition-colors"
        >
          How to Play
        </button>
      </div>

      <p className="text-[10px] text-white/20 max-w-xs text-center">
        No accounts. No passwords. Your identity lives only in this browser.
      </p>
    </div>
  );
}
