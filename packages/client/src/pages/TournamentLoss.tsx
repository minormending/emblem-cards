/**
 * Loss screen after a tournament defeat.
 *
 * No progress is lost and no reward is granted. Player can retry the same
 * opponent (re-runs startTournamentBattle with the saved deck) or go back
 * to the ladder to rebuild / pick a different approach.
 */
import { useGameStore } from "../store/gameStore";

export function TournamentLoss() {
  const setScreen = useGameStore((s) => s.setScreen);
  const startTournamentBattle = useGameStore((s) => s.startTournamentBattle);
  const currentOpponent = useGameStore((s) => s.currentOpponent);

  if (!currentOpponent) {
    setScreen("tournament-home");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="text-5xl font-black bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent tracking-tight">
          Defeated
        </div>
        <div className="text-sm text-white/50">by {currentOpponent.displayName}</div>
        <p className="text-xs text-white/40 italic">
          No progress lost. Regroup and try again.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={startTournamentBattle}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 rounded-xl font-black transition-all shadow-lg shadow-red-500/20"
          >
            Retry
          </button>
          <button
            onClick={() => setScreen("tournament-home")}
            className="w-full py-2 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Back to Tournament Home
          </button>
        </div>
      </div>
    </div>
  );
}
