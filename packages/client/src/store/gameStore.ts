/**
 * Zustand store that holds all client-side game state.
 *
 * Action dispatch is mode-agnostic: call `useGameStore.getState().actions.deploy(...)`
 * and the right local or online implementation runs based on `mode`. Adding a
 * third mode (replay, spectator, ...) means implementing another GameActions.
 *
 * File map:
 *   - actions/    : GameActions interface + local/online implementations
 *   - selectors.ts: mode-agnostic getters (currentPlayer, opponent info, ...)
 *   - aiTurn.ts   : AI opponent runner (scheduled from localEndTurn)
 *   - logStore.ts : the battle log (separate store so it doesn't re-render the world)
 *   - socket.ts   : singleton socket.io client
 *   - socketListeners.ts: server → client event handlers
 */
import { create } from "zustand";
import type { Card, FieldPosition, GameEvent, GameState, GameView, MatchStats } from "@cards/shared";
import { MESSAGE_DURATION_MS } from "@cards/shared";
import { createGame, drawPhase } from "@cards/battle-engine";
import { getSocket, disconnectSocket } from "./socket";
import { buildRandomDeck } from "../lib/deckBuilder";
import { useLogStore } from "./logStore";
import { loadDecks, saveDecks } from "../lib/decks";
import { getPlayerId, getDisplayName } from "../lib/identity";
import type { GameActions } from "./actions/types";
import { createLocalActions } from "./actions/local";
import { createOnlineActions } from "./actions/online";

type Screen = "menu" | "deck-builder" | "matchmaking" | "battle";
type GameMode = "local" | "online" | "ai";

interface GameStore {
  // ── Screen / mode ──
  screen: Screen;
  mode: GameMode;

  // ── Deck-builder state ──
  p1Deck: Card[];
  p2Deck: Card[];

  // ── Game state (one or the other is populated based on mode) ──
  gameState: GameState | null;  // local / ai
  gameView: GameView | null;    // online
  queuePosition: number;
  /** Private room code, set when hosting or joining via code. */
  roomCode: string | null;
  /** 'queue' = public matchmaking, 'host' = waiting for friend, 'guest' = joining. */
  roomRole: "queue" | "host" | "guest" | null;

  // ── End-of-match stats ──
  /** Raw event log for the current match. Used by local/AI mode to compute
   *  stats locally. Empty in online mode — server sends stats pre-computed. */
  matchEvents: GameEvent[];
  /** Server-provided stats for online mode. Local/AI compute at render time. */
  matchStats: MatchStats | null;

  // ── UI state ──
  selectedHandIndex: number | null;
  selectedAttackerPos: FieldPosition | null;
  /** Position that was just hit — drives the shake animation. */
  lastHitPos: FieldPosition | null;
  message: string | null;
  inspectedCard: Card | null;

  // ── Navigation / mutators ──
  setScreen: (screen: Screen) => void;
  setMode: (mode: GameMode) => void;
  setP1Deck: (deck: Card[]) => void;
  setP2Deck: (deck: Card[]) => void;
  setSelectedHandIndex: (i: number | null) => void;
  setSelectedAttackerPos: (pos: FieldPosition | null) => void;
  setLastHitPos: (pos: FieldPosition | null) => void;
  setInspectedCard: (card: Card | null) => void;
  showMessage: (msg: string) => void;

  // ── Game lifecycle ──
  quickStart: () => void;
  startLocalBattle: () => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  exitGame: () => void;

  // ── Unified actions ──
  /**
   * Mode-aware action surface. Call `getActions().deploy(...)` instead of
   * branching on mode in every component.
   */
  getActions: () => GameActions;
}

// Shared timer so rapid messages don't prematurely clear each other
let messageClearTimer: ReturnType<typeof setTimeout> | null = null;

function logSystemStart(gameState: GameState): void {
  useLogStore.getState().addEntry({
    turn: gameState.turnNumber,
    player: gameState.players[gameState.currentPlayerIndex].name,
    text: "Game started",
    type: "system",
  });
}

// The per-game UI + stats slots we want to clear whenever a new game begins.
const FRESH_UI_STATE = {
  selectedHandIndex: null,
  selectedAttackerPos: null,
  lastHitPos: null,
  message: null,
  inspectedCard: null,
  matchEvents: [] as GameEvent[],
  matchStats: null as MatchStats | null,
} as const;

/**
 * Connect the socket (if needed), authenticate, then run `afterAuth`. All
 * online actions (queue join, room create/join) share this setup so the
 * auth/listener wiring lives in one place.
 */
function connectAndRun(
  afterAuth: (socket: ReturnType<typeof getSocket>) => void,
): void {
  const socket = getSocket();

  const sendAuth = () => {
    socket.emit("auth", {
      playerId: getPlayerId(),
      displayName: getDisplayName(),
    });
    socket.once("auth:ok", () => afterAuth(socket));
    socket.once("auth:error", (msg) => {
      useGameStore.getState().showMessage(`Auth failed: ${msg}`);
      useGameStore.setState({ screen: "deck-builder" });
    });
  };

  if (!socket.connected) {
    // Lazy import avoids a circular dep with this store.
    import("./socketListeners").then(({ attachSocketListeners }) => {
      attachSocketListeners(socket, useGameStore);
    });
    socket.once("connect", sendAuth);
    socket.connect();
  } else {
    sendAuth();
  }
}

export const useGameStore = create<GameStore>((set, get) => {
  // Cached action implementations — rebuilt lazily when mode changes.
  let cachedMode: GameMode | null = null;
  let cachedActions: GameActions | null = null;

  const getActions = (): GameActions => {
    const { mode } = get();
    if (mode !== cachedMode) {
      cachedMode = mode;
      cachedActions = mode === "online"
        ? createOnlineActions(useGameStore)
        : createLocalActions(useGameStore);
    }
    return cachedActions!;
  };

  // Hydrate decks synchronously from localStorage so the deck-builder opens
  // with whatever the player had last time.
  const saved = loadDecks();

  return {
    // ── Initial state ──
    screen: "menu",
    mode: "local",
    p1Deck: saved?.p1Deck ?? [],
    p2Deck: saved?.p2Deck ?? [],
    gameState: null,
    gameView: null,
    queuePosition: 0,
    roomCode: null,
    roomRole: null,
    ...FRESH_UI_STATE,

    // ── Mutators ──
    setScreen: (screen) => set({ screen }),
    setMode: (mode) => set({ mode }),
    setP1Deck: (deck) => set({ p1Deck: deck }),
    setP2Deck: (deck) => set({ p2Deck: deck }),
    setSelectedHandIndex: (i) => set({ selectedHandIndex: i, selectedAttackerPos: null }),
    setSelectedAttackerPos: (pos) => set({ selectedAttackerPos: pos, selectedHandIndex: null }),
    setLastHitPos: (pos) => set({ lastHitPos: pos }),
    setInspectedCard: (card) => set({ inspectedCard: card }),

    showMessage: (msg) => {
      if (messageClearTimer !== null) clearTimeout(messageClearTimer);
      set({ message: msg });
      messageClearTimer = setTimeout(() => {
        set({ message: null });
        messageClearTimer = null;
      }, MESSAGE_DURATION_MS);
    },

    // ── Game lifecycle ──

    quickStart: () => {
      useLogStore.getState().clear();
      const p1Deck = buildRandomDeck();
      const p2Deck = buildRandomDeck();
      const state = createGame(p1Deck, p2Deck, "You", "AI");
      drawPhase(state);
      logSystemStart(state);
      set({
        mode: "ai",
        p1Deck,
        p2Deck,
        gameState: state,
        screen: "battle",
        ...FRESH_UI_STATE,
      });
    },

    startLocalBattle: () => {
      useLogStore.getState().clear();
      const { p1Deck, p2Deck, mode } = get();
      const p2Name = mode === "ai" ? "AI" : "Player 2";
      const p1Name = mode === "ai" ? "You" : "Player 1";
      const state = createGame(p1Deck, p2Deck, p1Name, p2Name);
      drawPhase(state);
      logSystemStart(state);
      set({
        gameState: state,
        screen: "battle",
        ...FRESH_UI_STATE,
      });
    },

    joinQueue: () => {
      const { p1Deck } = get();
      connectAndRun((socket) => socket.emit("queue:join", p1Deck));
      set({ screen: "matchmaking", queuePosition: 0, roomRole: "queue", roomCode: null });
    },

    leaveQueue: () => {
      const socket = getSocket();
      if (socket.connected) socket.emit("queue:leave");
      set({ screen: "deck-builder", queuePosition: 0, roomRole: null });
    },

    createRoom: () => {
      const { p1Deck } = get();
      connectAndRun((socket) => socket.emit("room:create", p1Deck));
      set({ screen: "matchmaking", roomRole: "host", roomCode: null });
    },

    joinRoom: (code: string) => {
      const { p1Deck } = get();
      connectAndRun((socket) => socket.emit("room:join", { code, deck: p1Deck }));
      set({ screen: "matchmaking", roomRole: "guest", roomCode: code.toUpperCase() });
    },

    leaveRoom: () => {
      const socket = getSocket();
      if (socket.connected) socket.emit("room:leave");
      set({ screen: "deck-builder", roomRole: null, roomCode: null });
    },

    exitGame: () => {
      disconnectSocket();
      set({
        screen: "menu",
        gameState: null,
        gameView: null,
        queuePosition: 0,
        roomCode: null,
        roomRole: null,
        ...FRESH_UI_STATE,
      });
    },

    // ── Actions ──
    getActions,
  };
});

// ── Deck auto-save ───────────────────────────────────────────────────────
// Persist p1Deck/p2Deck on every change. Reference-equal dedupe so unrelated
// state updates don't thrash localStorage.
let lastSavedP1: unknown = null;
let lastSavedP2: unknown = null;
useGameStore.subscribe((state) => {
  if (state.p1Deck === lastSavedP1 && state.p2Deck === lastSavedP2) return;
  lastSavedP1 = state.p1Deck;
  lastSavedP2 = state.p2Deck;
  saveDecks(state.p1Deck, state.p2Deck);
});

// Re-export selectors as named imports from gameStore for convenience.
// (Battle components typically need both the store and the selectors.)
export {
  getCurrentPlayer,
  getOpponentInfo,
  getIsMyTurn,
  getTurnNumber,
  getWinner,
} from "./selectors";
