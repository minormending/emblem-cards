import type { Card, FieldPosition, GameState, Player } from "./types.js";
import type { GameEvent } from "./events.js";
import type { MatchStats } from "./stats.js";

// ── Client → Server events ──

export interface AuthPayload {
  /** Client-generated UUID, persists across sessions in localStorage. */
  playerId: string;
  /** User-chosen display name (optional label). */
  displayName: string;
}

export interface ClientToServerEvents {
  /** Identify the player. Must be sent before any other event. */
  "auth": (payload: AuthPayload) => void;
  /** Join the matchmaking queue with a deck */
  "queue:join": (deck: Card[]) => void;
  /** Leave the matchmaking queue */
  "queue:leave": () => void;
  /** Create a private room; server replies with a short code */
  "room:create": (deck: Card[]) => void;
  /** Join an existing private room by code */
  "room:join": (data: { code: string; deck: Card[] }) => void;
  /** Leave a private room before the game starts */
  "room:leave": () => void;
  /** Deploy a card from hand */
  "game:deploy": (handIndex: number, target?: FieldPosition) => void;
  /** Attack with a unit */
  "game:attack": (from: FieldPosition, to: FieldPosition) => void;
  /** End current turn */
  "game:end-turn": () => void;
}

// ── Server → Client events ──

/** A sanitized view of the game for one player (hides opponent's hand/deck) */
export interface GameView {
  you: Player;
  opponent: {
    id: string;
    name: string;
    field: Player["field"];
    handCount: number;
    deckCount: number;
    discardCount: number;
    energy: number;
    maxEnergy: number;
  };
  isYourTurn: boolean;
  turnNumber: number;
  winner: string | null;
}

export interface ServerToClientEvents {
  /** Auth accepted. Safe to send queue/game events. */
  "auth:ok": () => void;
  /** Auth failed (malformed payload or duplicate session). */
  "auth:error": (message: string) => void;
  /** Queued for matchmaking */
  "queue:joined": (data: { position: number }) => void;
  /** Match found, game starting */
  "game:start": (view: GameView) => void;
  /** Game state updated after any action */
  "game:update": (view: GameView) => void;
  /** An action failed */
  "game:error": (message: string) => void;
  /** Action result for feedback (damage dealt, played cards, etc.) */
  "game:action-result": (result: {
    type: "deploy" | "attack" | "end-turn";
    damage?: number;
    targetPos?: FieldPosition;
    /** Events produced by this action — lets clients drive overlay/SFX. */
    events?: GameEvent[];
    /** Player who initiated the action (for perspective-aware UI). */
    actorId?: string;
  }) => void;
  /** Game is over. Includes end-of-match stats for the victory screen. */
  "game:over": (data: { winner: string; turnCount: number; stats: MatchStats | null }) => void;
  /** Queue position updated */
  "queue:update": (data: { position: number }) => void;
  /** Private room created; share this code with your opponent. */
  "room:created": (data: { code: string }) => void;
  /** Attempt to join or create a room failed. */
  "room:error": (message: string) => void;
}
