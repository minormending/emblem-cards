/**
 * Tournament Home — the ladder view.
 *
 * Shows 8 opponent rows (defeated / next / locked), a strip of unlocked
 * cards (collection), and Replay / Reset buttons. Clicking the "Next" row
 * stages that opponent and routes to the pre-match screen.
 *
 * This screen reads from both `useGameStore` (for navigation) and
 * `useTournamentStore` (for progression), but writes only to the tournament
 * store via its actions — never to localStorage directly.
 */
import { OPPONENTS } from "@cards/shared";
import type { TournamentOpponent } from "@cards/shared";
import { getCardById } from "@cards/card-engine";
import { useGameStore } from "../store/gameStore";
import { useTournamentStore } from "../store/tournamentStore";
import { CardView } from "../components/CardView";

export function TournamentHome() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setCurrentOpponent = useGameStore((s) => s.setCurrentOpponent);
  const exitGame = useGameStore((s) => s.exitGame);
  const currentRound = useTournamentStore((s) => s.currentRound);
  const unlockedCards = useTournamentStore((s) => s.unlockedCards);
  const timesCompleted = useTournamentStore((s) => s.timesCompleted);
  const replay = useTournamentStore((s) => s.replay);
  const reset = useTournamentStore((s) => s.reset);

  const isDefeated = (o: TournamentOpponent) => o.order <= currentRound;
  const isNext = (o: TournamentOpponent) => o.order === currentRound + 1;

  function onRowClick(o: TournamentOpponent) {
    if (!isNext(o)) return;
    setCurrentOpponent(o);
    setScreen("tournament-pre-match");
  }

  function onReset() {
    if (typeof window !== "undefined" && !window.confirm(
      "Reset tournament? This will wipe all unlocked cards and progress."
    )) return;
    reset();
  }

  const clearedAll = currentRound >= 8;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <header className="flex justify-between items-center px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={exitGame}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Back
          </button>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-300 to-red-400 bg-clip-text text-transparent">
            Tournament
          </h1>
          <span className="text-xs text-white/50 font-mono">
            {currentRound} / 8
          </span>
          {timesCompleted > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5">
              Champion x{timesCompleted}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {clearedAll && (
            <button
              onClick={replay}
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors"
            >
              Replay Tournament
            </button>
          )}
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Ladder */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Ladder</h2>
          <div className="space-y-2">
            {OPPONENTS.map((o) => (
              <LadderRow
                key={o.id}
                opponent={o}
                defeated={isDefeated(o)}
                next={isNext(o)}
                onClick={() => onRowClick(o)}
              />
            ))}
          </div>
        </section>

        {/* Collection */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
            Collection ({unlockedCards.length})
          </h2>
          {unlockedCards.length === 0 ? (
            <p className="text-sm text-white/30 italic">
              Defeat an opponent to unlock their signature card.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {unlockedCards.map((id) => {
                const card = getCardById(id);
                if (!card) return null;
                return (
                  <div key={id} className="shrink-0">
                    <CardView card={card} small />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Ladder row ──

function LadderRow({
  opponent,
  defeated,
  next,
  onClick,
}: {
  opponent: TournamentOpponent;
  defeated: boolean;
  next: boolean;
  onClick: () => void;
}) {
  const locked = !defeated && !next;
  const status = defeated ? "Defeated" : next ? "Next" : "Locked";
  const rewardCard = defeated ? getCardById(opponent.rewardCardId) : null;

  const baseBg = defeated
    ? "bg-emerald-500/5 border-emerald-500/20"
    : next
      ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10 hover:bg-amber-500/15 cursor-pointer"
      : "bg-white/5 border-white/10 opacity-50";

  return (
    <div
      onClick={next ? onClick : undefined}
      className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${baseBg}`}
    >
      {/* Tier badge */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
          defeated
            ? "bg-emerald-500/20 text-emerald-300"
            : next
              ? "bg-amber-500/30 text-amber-200"
              : "bg-white/10 text-white/40"
        }`}
      >
        {opponent.order}
      </div>

      {/* Name + archetype */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">
          {locked ? "???" : opponent.displayName}
        </div>
        <div className="text-[11px] text-white/40 uppercase tracking-wider">
          {locked ? "Locked" : opponent.archetype}
        </div>
      </div>

      {/* Reward preview */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              defeated
                ? "text-emerald-400"
                : next
                  ? "text-amber-300"
                  : "text-white/30"
            }`}
          >
            {status}
          </div>
        </div>
        <div className="w-12 h-16 shrink-0">
          {defeated && rewardCard ? (
            <div className="scale-[0.35] origin-top-right">
              <CardView card={rewardCard} small />
            </div>
          ) : (
            <div className="w-full h-full rounded border border-white/10 bg-gradient-to-br from-purple-900/40 to-gray-900 flex items-center justify-center text-xl text-white/30">
              ?
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
