/**
 * Integration smoke test for the tournament happy-path.
 *
 * The client's Vitest env is plain node (no jsdom/RTL) per vitest.config.ts,
 * so this test exercises the screen/mode/store wiring at the ZUSTAND level
 * rather than rendering components. It mirrors what a user does:
 *
 *   1. Menu → setMode("tournament") + setScreen("tournament-home")
 *   2. Click opponent #1 → setCurrentOpponent + setScreen("tournament-pre-match")
 *   3. Save a deck via the tournament store (bypass the deck-builder UI)
 *   4. Tap Fight → startTournamentBattle (creates gameState)
 *   5. Force-win by mutating gameState.winner to the player
 *   6. Record match completion via tournamentStore.completeMatch
 *   7. Assert progression: currentRound === 1 and unlockedCards has reward #1
 *
 * We deliberately skip the AI battle simulation — that's covered by
 * battle-engine tests. This test verifies ONLY the client-side plumbing
 * between screens / stores / persistence.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { Card } from "@cards/shared";
import { OPPONENTS } from "@cards/shared";
import { getCardById } from "@cards/card-engine";
import { useGameStore } from "../../store/gameStore";
import { useTournamentStore } from "../../store/tournamentStore";

function buildLegalStarterDeck(): Card[] {
  // A minimum legal deck: 15 cards, one Lord, everything valid.
  // We just reuse opponent #1's deck — known to be legal (validated upstream).
  return OPPONENTS[0].deck
    .map((id) => getCardById(id))
    .filter((c): c is Card => !!c)
    .map((c) => ({ ...c }));
}

beforeEach(() => {
  localStorage.clear();
  useTournamentStore.getState().hydrate();
  // Reset the game store back to a clean menu state.
  useGameStore.setState({
    screen: "menu",
    mode: "local",
    gameState: null,
    currentOpponent: null,
  });
});

describe("tournament flow (integration)", () => {
  it("menu → home → pre-match → fight → win advances the ladder", () => {
    const game = useGameStore.getState();
    const tournament = useTournamentStore.getState();

    // 1. Menu → Home
    game.setMode("tournament");
    game.setScreen("tournament-home");
    expect(useGameStore.getState().screen).toBe("tournament-home");
    expect(useGameStore.getState().mode).toBe("tournament");

    // 2. Only opponent #1 is unlocked at fresh start.
    expect(tournament.isOpponentUnlocked(1)).toBe(true);
    expect(tournament.isOpponentUnlocked(2)).toBe(false);

    // 3. Pick opponent #1 → pre-match.
    const opp1 = OPPONENTS[0];
    game.setCurrentOpponent(opp1);
    game.setScreen("tournament-pre-match");
    expect(useGameStore.getState().currentOpponent?.id).toBe(opp1.id);

    // 4. Save a legal deck. (Deck-builder UI skipped in this test.)
    tournament.setTournamentDeck(buildLegalStarterDeck());
    expect(useTournamentStore.getState().tournamentDeck).toBeTruthy();

    // 5. Fight → gameState is populated, mode pinned to "tournament".
    game.startTournamentBattle();
    const state = useGameStore.getState();
    expect(state.mode).toBe("tournament");
    expect(state.gameState).not.toBeNull();
    expect(state.screen).toBe("battle");

    // 6. Simulate a forced win — the Battle screen's effect would normally
    //    call completeMatch + route to tournament-reward. We simulate that
    //    directly here so the test doesn't depend on React render cycles.
    tournament.completeMatch(true, opp1);
    useGameStore.setState({ screen: "tournament-reward" });

    // 7. Assertions on progression.
    const progress = useTournamentStore.getState();
    expect(progress.currentRound).toBe(1);
    expect(progress.unlockedCards).toContain(opp1.rewardCardId);

    // Opponent #2 should now be unlocked.
    expect(progress.isOpponentUnlocked(2)).toBe(true);

    // 8. Back to Tournament Home.
    useGameStore.setState({ screen: "tournament-home" });
    expect(useGameStore.getState().screen).toBe("tournament-home");
  });

  it("loss is a no-op — currentRound does not advance", () => {
    const game = useGameStore.getState();
    const tournament = useTournamentStore.getState();

    game.setMode("tournament");
    const opp1 = OPPONENTS[0];
    game.setCurrentOpponent(opp1);
    tournament.setTournamentDeck(buildLegalStarterDeck());
    game.startTournamentBattle();

    // Loss path.
    tournament.completeMatch(false, opp1);
    useGameStore.setState({ screen: "tournament-loss" });

    const progress = useTournamentStore.getState();
    expect(progress.currentRound).toBe(0);
    expect(progress.unlockedCards).toHaveLength(0);
  });
});
