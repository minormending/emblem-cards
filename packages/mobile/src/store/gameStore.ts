import { create } from 'zustand';
import type { Card, FieldPosition, GameState, GameView } from '@cards/shared';
import { MESSAGE_DURATION_MS, cloneCard } from '@cards/shared';
import { createGame, drawPhase } from '@cards/battle-engine';
import { getSocket, disconnectSocket } from './socket';
import { buildRandomDeck } from '../lib/deckBuilder';
import { useLogStore } from './logStore';
import { getPlayerId, getDisplayName } from '../lib/identity';
import type { GameActions } from './actions/types';
import { createLocalActions } from './actions/local';
import { createOnlineActions } from './actions/online';
import { saveSession, clearSession, loadSession } from '../lib/session';
import { saveDecks, loadDecks } from '../lib/decks';

type Screen = 'menu' | 'deck-builder' | 'matchmaking' | 'battle';
type GameMode = 'local' | 'online' | 'ai';

interface GameStore {
  screen: Screen;
  mode: GameMode;
  p1Deck: Card[];
  p2Deck: Card[];
  gameState: GameState | null;
  gameView: GameView | null;
  queuePosition: number;
  /** Socket lifecycle state, surfaced so Matchmaking can show meaningful text. */
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  connectionError: string | null;
  selectedHandIndex: number | null;
  selectedAttackerPos: FieldPosition | null;
  lastHitPos: FieldPosition | null;
  message: string | null;
  inspectedCard: Card | null;
  setScreen: (screen: Screen) => void;
  setMode: (mode: GameMode) => void;
  setP1Deck: (deck: Card[]) => void;
  setP2Deck: (deck: Card[]) => void;
  setSelectedHandIndex: (i: number | null) => void;
  setSelectedAttackerPos: (pos: FieldPosition | null) => void;
  setLastHitPos: (pos: FieldPosition | null) => void;
  setInspectedCard: (card: Card | null) => void;
  showMessage: (msg: string) => void;
  quickStart: () => void;
  startLocalBattle: () => void;
  joinQueue: () => void;
  leaveQueue: () => void;
  exitGame: () => void;
  rematch: () => void;
  /** Restore a previously-saved local/AI battle. Call after hydration. */
  resumeSession: () => Promise<boolean>;
  /** Drop the saved session without restoring it. */
  discardSession: () => Promise<void>;
  /** Load the player's persisted decks into the store. Called at app boot. */
  hydrateDecks: () => Promise<void>;
  getActions: () => GameActions;
}

let messageClearTimer: ReturnType<typeof setTimeout> | null = null;

function logSystemStart(gameState: GameState): void {
  useLogStore.getState().addEntry({
    turn: gameState.turnNumber,
    player: gameState.players[gameState.currentPlayerIndex].name,
    text: 'Game started',
    type: 'system',
  });
}

const FRESH_UI_STATE = {
  selectedHandIndex: null,
  selectedAttackerPos: null,
  lastHitPos: null,
  message: null,
  inspectedCard: null,
} as const;

export const useGameStore = create<GameStore>((set, get) => {
  let cachedMode: GameMode | null = null;
  let cachedActions: GameActions | null = null;

  const getActions = (): GameActions => {
    const { mode } = get();
    if (mode !== cachedMode) {
      cachedMode = mode;
      cachedActions =
        mode === 'online'
          ? createOnlineActions(useGameStore)
          : createLocalActions(useGameStore);
    }
    return cachedActions!;
  };

  return {
    screen: 'menu',
    mode: 'local',
    p1Deck: [],
    p2Deck: [],
    gameState: null,
    gameView: null,
    queuePosition: 0,
    connectionStatus: 'idle',
    connectionError: null,
    ...FRESH_UI_STATE,

    setScreen: (screen) => set({ screen }),
    setMode: (mode) => set({ mode }),
    setP1Deck: (deck) => set({ p1Deck: deck }),
    setP2Deck: (deck) => set({ p2Deck: deck }),
    setSelectedHandIndex: (i) =>
      set({ selectedHandIndex: i, selectedAttackerPos: null }),
    setSelectedAttackerPos: (pos) =>
      set({ selectedAttackerPos: pos, selectedHandIndex: null }),
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

    quickStart: () => {
      useLogStore.getState().clear();
      const p1Deck = buildRandomDeck();
      const p2Deck = buildRandomDeck();
      const state = createGame(p1Deck, p2Deck, 'You', 'AI');
      drawPhase(state);
      logSystemStart(state);
      set({
        mode: 'ai',
        p1Deck,
        p2Deck,
        gameState: state,
        screen: 'battle',
        ...FRESH_UI_STATE,
      });
    },

    startLocalBattle: () => {
      useLogStore.getState().clear();
      const { p1Deck, p2Deck, mode } = get();
      const p2Name = mode === 'ai' ? 'AI' : 'Player 2';
      const p1Name = mode === 'ai' ? 'You' : 'Player 1';
      const state = createGame(p1Deck, p2Deck, p1Name, p2Name);
      drawPhase(state);
      logSystemStart(state);
      set({
        gameState: state,
        screen: 'battle',
        ...FRESH_UI_STATE,
      });
    },

    joinQueue: () => {
      const { p1Deck } = get();
      const socket = getSocket();
      const sendAuthAndJoin = () => {
        set({ connectionStatus: 'connected', connectionError: null });
        socket.emit('auth', {
          playerId: getPlayerId(),
          displayName: getDisplayName(),
        });
        socket.once('auth:ok', () => socket.emit('queue:join', p1Deck));
        socket.once('auth:error', (msg) => {
          get().showMessage(`Auth failed: ${msg}`);
          set({ screen: 'deck-builder' });
        });
      };
      if (!socket.connected) {
        import('./socketListeners').then(({ attachSocketListeners }) => {
          attachSocketListeners(socket, useGameStore);
        });
        socket.once('connect', sendAuthAndJoin);
        socket.once('connect_error', (err: Error) => {
          set({
            connectionStatus: 'error',
            connectionError: err.message || 'Connection failed',
          });
        });
        socket.connect();
      } else {
        sendAuthAndJoin();
      }
      set({
        screen: 'matchmaking',
        queuePosition: 0,
        connectionStatus: 'connecting',
        connectionError: null,
      });
    },

    leaveQueue: () => {
      const socket = getSocket();
      if (socket.connected) socket.emit('queue:leave');
      set({ screen: 'deck-builder', queuePosition: 0 });
    },

    exitGame: () => {
      disconnectSocket();
      // Best-effort — persistence is best-effort so failing here doesn't
      // block the user from leaving the game.
      void clearSession();
      set({
        screen: 'menu',
        gameState: null,
        gameView: null,
        queuePosition: 0,
        connectionStatus: 'idle',
        connectionError: null,
        ...FRESH_UI_STATE,
      });
    },

    rematch: () => {
      const { p1Deck, p2Deck, mode } = get();
      // Deep clone — battle-engine mutates HP/hasActed on card instances.
      const fresh1 = p1Deck.map(cloneCard);
      const fresh2 = p2Deck.map(cloneCard);
      useLogStore.getState().clear();
      const p1Name = mode === 'ai' ? 'You' : 'Player 1';
      const p2Name = mode === 'ai' ? 'AI' : 'Player 2';
      const state = createGame(fresh1, fresh2, p1Name, p2Name);
      drawPhase(state);
      logSystemStart(state);
      set({
        p1Deck: fresh1,
        p2Deck: fresh2,
        gameState: state,
        ...FRESH_UI_STATE,
      });
    },

    resumeSession: async () => {
      const snap = await loadSession();
      if (!snap) return false;
      useLogStore.getState().clear();
      set({
        mode: snap.mode,
        p1Deck: snap.p1Deck,
        p2Deck: snap.p2Deck,
        gameState: snap.gameState,
        screen: 'battle',
        ...FRESH_UI_STATE,
      });
      return true;
    },

    discardSession: async () => {
      await clearSession();
    },

    hydrateDecks: async () => {
      const decks = await loadDecks();
      if (decks) set({ p1Deck: decks.p1Deck, p2Deck: decks.p2Deck });
    },

    getActions,
  };
});

// ── Deck auto-save ─────────────────────────────────────────────────────────
// Persist p1Deck/p2Deck on every change so deck-building progress survives
// across app launches. Reference-equal dedupe so unrelated state updates
// don't thrash AsyncStorage.
let lastSavedP1: unknown = null;
let lastSavedP2: unknown = null;
useGameStore.subscribe((state) => {
  if (state.p1Deck === lastSavedP1 && state.p2Deck === lastSavedP2) return;
  lastSavedP1 = state.p1Deck;
  lastSavedP2 = state.p2Deck;
  void saveDecks(state.p1Deck, state.p2Deck);
});

// ── Auto-save ──────────────────────────────────────────────────────────────
// Watch for gameState changes on local/ai modes and persist a snapshot so an
// interrupted match can be resumed on next launch. Online mode is server-owned
// and not persisted here.
let lastSavedGameState: unknown = null;
useGameStore.subscribe((state) => {
  if (state.mode !== 'local' && state.mode !== 'ai') return;
  if (!state.gameState) return;
  if (state.gameState === lastSavedGameState) return;
  lastSavedGameState = state.gameState;
  if (state.gameState.winner) {
    void clearSession();
    return;
  }
  void saveSession({
    mode: state.mode,
    gameState: state.gameState,
    p1Deck: state.p1Deck,
    p2Deck: state.p2Deck,
  });
});

export {
  getCurrentPlayer,
  getOpponentInfo,
  getIsMyTurn,
  getTurnNumber,
  getWinner,
} from './selectors';
