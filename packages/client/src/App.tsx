import { useGameStore } from "./store/gameStore";
import { useTournamentStore } from "./store/tournamentStore";
import { Menu } from "./pages/Menu";
import { ModeSelect } from "./pages/ModeSelect";
import { DeckBuilder } from "./pages/DeckBuilder";
import { Matchmaking } from "./pages/Matchmaking";
import { Battle } from "./pages/Battle";
import { TournamentHome } from "./pages/TournamentHome";
import { TournamentPreMatch } from "./pages/TournamentPreMatch";
import { TournamentReward } from "./pages/TournamentReward";
import { TournamentLoss } from "./pages/TournamentLoss";
import { TournamentDeckBuilder } from "./pages/TournamentDeckBuilder";

// Boot hydration: tournament persistence is synchronous (localStorage), so
// calling this at module load means the store has real values before any
// component renders. No loading spinner needed.
useTournamentStore.getState().hydrate();

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const mode = useGameStore((s) => s.mode);

  switch (screen) {
    case "menu":
      return <Menu />;
    case "mode-select":
      return <ModeSelect />;
    case "deck-builder":
      // Tournament deck-builder is a thin wrapper that supplies pool filter
      // and a save callback; everything else reuses the regular DeckBuilder.
      return mode === "tournament" ? <TournamentDeckBuilder /> : <DeckBuilder />;
    case "matchmaking":
      return <Matchmaking />;
    case "battle":
      return <Battle />;
    case "tournament-home":
      return <TournamentHome />;
    case "tournament-pre-match":
      return <TournamentPreMatch />;
    case "tournament-reward":
      return <TournamentReward />;
    case "tournament-loss":
      return <TournamentLoss />;
  }
}
