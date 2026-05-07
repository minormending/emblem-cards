/**
 * Pre-Match screen — shown after the player taps a ladder row.
 *
 * Summarizes the opponent (name, archetype, blurb), previews the face-down
 * reward, and offers two routes:
 *   - Build Deck → DeckBuilder (tournament-scoped, via poolFilter)
 *   - Fight!     → startTournamentBattle (enabled once a legal deck is saved)
 *
 * The "Fight!" enablement rules mirror the deck-builder's validation so the
 * player gets the same feedback here that they got before saving.
 */
import type { Card } from "@cards/shared";
import { DECK_SIZE } from "@cards/shared";
import { useGameStore } from "../store/gameStore";
import { useTournamentStore } from "../store/tournamentStore";

export function TournamentPreMatch() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setMode = useGameStore((s) => s.setMode);
  const setP1Deck = useGameStore((s) => s.setP1Deck);
  const startTournamentBattle = useGameStore((s) => s.startTournamentBattle);
  const currentOpponent = useGameStore((s) => s.currentOpponent);
  const tournamentDeck = useTournamentStore((s) => s.tournamentDeck);

  if (!currentOpponent) {
    // Defensive: if somehow we landed here without an opponent, bounce home.
    setScreen("tournament-home");
    return null;
  }

  function goBuildDeck() {
    setMode("tournament");
    // Seed the deck-builder with the last-saved tournament deck (or empty).
    setP1Deck(tournamentDeck ? [...tournamentDeck] : []);
    setScreen("deck-builder");
  }

  const deckReady = isDeckReady(tournamentDeck);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
            Round {currentOpponent.order}
          </div>
          <div
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500/30 to-red-500/30 border border-amber-500/40 flex items-center justify-center text-3xl font-black"
            aria-label={`${currentOpponent.archetype} archetype icon`}
          >
            {archetypeGlyph(currentOpponent.archetype)}
          </div>
          <h1 className="text-3xl font-black mt-4">{currentOpponent.displayName}</h1>
          <div className="text-xs uppercase tracking-widest text-amber-300 mt-1">
            {currentOpponent.archetype}
          </div>
          <p className="text-sm text-white/70 italic mt-3">
            &ldquo;{currentOpponent.blurb}&rdquo;
          </p>
        </div>

        {/* Reward preview (face-down) */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Reward</div>
          <div className="w-24 h-32 rounded-lg border border-purple-500/40 bg-gradient-to-br from-purple-900/40 to-gray-900 flex items-center justify-center text-3xl text-white/40">
            ?
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={goBuildDeck}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            {tournamentDeck ? "Edit Deck" : "Build Deck"}
          </button>
          <button
            onClick={deckReady ? startTournamentBattle : undefined}
            disabled={!deckReady}
            className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
              deckReady
                ? "bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 shadow-lg shadow-red-500/20"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            Fight!
          </button>
          {!deckReady && (
            <p className="text-[11px] text-center text-white/40">
              Build a legal deck first ({DECK_SIZE} cards, one Lord).
            </p>
          )}
          <button
            onClick={() => setScreen("tournament-home")}
            className="w-full py-2 text-xs text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Back to Tournament
          </button>
        </div>
      </div>
    </div>
  );
}

function isDeckReady(deck: Card[] | null): boolean {
  if (!deck) return false;
  if (deck.length !== DECK_SIZE) return false;
  if (!deck.some((c) => c.type === "unit" && c.isLord)) return false;
  return true;
}

/** Single-glyph icon per archetype — cheap, no art assets needed. */
function archetypeGlyph(archetype: string): string {
  switch (archetype) {
    case "infantry": return "S";
    case "bow": return "B";
    case "mounted": return "M";
    case "flying": return "F";
    case "magic": return "A";
    case "armor": return "K";
    case "disruption": return "T";
    case "champion": return "C";
    default: return "?";
  }
}
