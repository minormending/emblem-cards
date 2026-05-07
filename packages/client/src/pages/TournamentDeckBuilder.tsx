/**
 * Tournament-scoped wrapper around the generic DeckBuilder.
 *
 * Passes a `poolFilter` that restricts visible cards to
 * STARTER_POOL ∪ unlockedCards, and supplies an `onSave` that persists the
 * deck to the tournament store and returns the player to the pre-match
 * screen (NOT straight to battle — the player reviews and hits Fight!).
 */
import type { Card } from "@cards/shared";
import { STARTER_POOL } from "@cards/shared";
import { DeckBuilder } from "./DeckBuilder";
import { useGameStore } from "../store/gameStore";
import { useTournamentStore } from "../store/tournamentStore";

export function TournamentDeckBuilder() {
  const setScreen = useGameStore((s) => s.setScreen);
  const unlockedCards = useTournamentStore((s) => s.unlockedCards);
  const setTournamentDeck = useTournamentStore((s) => s.setTournamentDeck);

  const pool = new Set<string>([...STARTER_POOL, ...unlockedCards]);

  function onSave(deck: Card[]) {
    setTournamentDeck(deck);
    setScreen("tournament-pre-match");
  }

  return (
    <DeckBuilder poolFilter={pool} onSave={onSave} saveLabel="Save Deck" />
  );
}
