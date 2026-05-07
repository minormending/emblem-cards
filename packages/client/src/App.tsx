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
    default: {
      // Compile-time exhaustiveness — if a new Screen value is added without
      // a case here, this assignment becomes a type error and surfaces in
      // tsc instead of a blank page in production. The runtime fallback
      // resets the user to the menu so a corrupt persisted screen value
      // (e.g. from an older app version) doesn't trap them.
      const _exhaustive: never = screen;
      void _exhaustive;
      if (typeof console !== "undefined" && console.warn) {
        console.warn("Unknown screen value, returning to menu:", screen);
      }
      // Defer the reset to the next tick so we don't update state during render.
      queueMicrotask(() => useGameStore.getState().setScreen("menu"));
      return <Menu />;
    }
  }
}
