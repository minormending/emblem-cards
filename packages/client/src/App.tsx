import { useGameStore } from "./store/gameStore";
import { Menu } from "./pages/Menu";
import { DeckBuilder } from "./pages/DeckBuilder";
import { Matchmaking } from "./pages/Matchmaking";
import { Battle } from "./pages/Battle";

export default function App() {
  const screen = useGameStore((s) => s.screen);

  switch (screen) {
    case "menu":
      return <Menu />;
    case "deck-builder":
      return <DeckBuilder />;
    case "matchmaking":
      return <Matchmaking />;
    case "battle":
      return <Battle />;
  }
}
