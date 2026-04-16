import type { Card, FieldPosition, GameEvent, GameState, GameView, Result } from "@cards/shared";
import { ok, err, ErrorCode } from "@cards/shared";
import {
  createGame,
  drawPhase,
  deployCard,
  attackAction,
  endTurn,
  checkWinCondition,
} from "@cards/battle-engine";

/**
 * One active multiplayer match.
 *
 * Wraps a GameState and enforces turn-order ownership — callers pass in
 * `playerId`, and the action is rejected unless it's that player's turn.
 *
 * Actions return Result<GameEvent[]> (or Result<void> for endTurn, which
 * can't fail at this layer). The socket handler translates success/failure
 * into broadcast events or "game:error" emits.
 */
export class GameRoom {
  id: string;
  state: GameState;
  playerIds: [string, string];
  /** Running event log for post-match stats. */
  events: GameEvent[] = [];

  constructor(
    id: string,
    p1Id: string,
    p1Deck: Card[],
    p2Id: string,
    p2Deck: Card[],
    p1Name?: string,
    p2Name?: string
  ) {
    this.id = id;
    this.playerIds = [p1Id, p2Id];
    this.state = createGame(p1Deck, p2Deck, p1Id, p2Id);
    if (p1Name) this.state.players[0].name = p1Name;
    if (p2Name) this.state.players[1].name = p2Name;
    drawPhase(this.state);
  }

  getPlayerIndex(playerId: string): 0 | 1 | null {
    if (this.playerIds[0] === playerId) return 0;
    if (this.playerIds[1] === playerId) return 1;
    return null;
  }

  isPlayerTurn(playerId: string): boolean {
    return this.getPlayerIndex(playerId) === this.state.currentPlayerIndex;
  }

  /**
   * Sanitized per-player view of the game. Opponent's hand/deck are sent
   * as counts only — never the actual cards.
   */
  getView(playerId: string): GameView {
    const idx = this.getPlayerIndex(playerId);
    if (idx === null) throw new Error("Player not in this game");

    const me = this.state.players[idx];
    const them = this.state.players[idx === 0 ? 1 : 0];

    return {
      you: me,
      opponent: {
        id: them.id,
        name: them.name,
        field: them.field,
        handCount: them.hand.length,
        deckCount: them.deck.length,
        discardCount: them.discardPile.length,
        energy: them.energy,
        maxEnergy: them.maxEnergy,
      },
      isYourTurn: this.state.currentPlayerIndex === idx,
      turnNumber: this.state.turnNumber,
      winner: this.state.winner,
    };
  }

  deploy(playerId: string, handIndex: number, target?: FieldPosition): Result<GameEvent[]> {
    if (!this.isPlayerTurn(playerId)) return err(ErrorCode.NOT_YOUR_TURN);
    const result = deployCard(this.state, handIndex, target);
    if (result.ok) this.events.push(...result.value);
    return result;
  }

  attack(playerId: string, from: FieldPosition, to: FieldPosition): Result<GameEvent[]> {
    if (!this.isPlayerTurn(playerId)) return err(ErrorCode.NOT_YOUR_TURN);
    const result = attackAction(this.state, from, to);
    if (result.ok) this.events.push(...result.value);
    return result;
  }

  doEndTurn(playerId: string): Result<GameEvent[]> {
    if (!this.isPlayerTurn(playerId)) return err(ErrorCode.NOT_YOUR_TURN);
    const events = endTurn(this.state);

    if (!this.state.winner) {
      const drew = drawPhase(this.state);
      if (drew.ok && drew.value === false) {
        // Can't draw — if this is a losing condition, set winner
        const winner = checkWinCondition(this.state);
        if (winner) {
          this.state.winner = winner;
          events.push({ kind: "game_won", winner, reason: "deck_out" });
        }
      }
    }

    this.events.push(...events);
    return ok(events);
  }
}
