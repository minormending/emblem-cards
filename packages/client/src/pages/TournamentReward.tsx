/**
 * Reward reveal after a tournament victory.
 *
 * Reads `currentOpponent` from the game store (set by the battle entry path)
 * and resolves its `rewardCardId` to a full Card for display. Match
 * progression has already been recorded by the Battle screen's effect hook
 * before we rendered — this screen is purely presentation.
 */
import { useEffect, useState } from "react";
import { getCardById } from "@cards/card-engine";
import { useGameStore } from "../store/gameStore";
import { CardView } from "../components/CardView";

export function TournamentReward() {
  const setScreen = useGameStore((s) => s.setScreen);
  const currentOpponent = useGameStore((s) => s.currentOpponent);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!currentOpponent) {
    setScreen("tournament-home");
    return null;
  }

  const card = getCardById(currentOpponent.rewardCardId);
  const isChampion = currentOpponent.order === 8;

  function onContinue() {
    setScreen("tournament-home");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-amber-950/20 to-black text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full space-y-6 text-center">
        {isChampion && (
          <div className="text-5xl font-black bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 bg-clip-text text-transparent tracking-tight">
            Champion!
          </div>
        )}
        <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Victory</div>
        <h1 className="text-3xl font-black">
          {currentOpponent.displayName} defeated.
        </h1>
        <p className="text-sm text-white/50">A new card joins your collection.</p>

        <div
          className={`flex justify-center transition-all duration-700 ${
            revealed ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
          style={{ filter: revealed ? "drop-shadow(0 0 24px rgba(251,191,36,0.5))" : undefined }}
        >
          {card ? (
            <CardView card={card} detailArt />
          ) : (
            <div className="text-white/40">Reward card not found: {currentOpponent.rewardCardId}</div>
          )}
        </div>

        <button
          onClick={onContinue}
          className="mt-4 px-8 py-3 bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 rounded-xl font-black shadow-lg shadow-amber-500/20 transition-all"
        >
          Add to Collection
        </button>
      </div>
    </div>
  );
}
