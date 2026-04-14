import { create } from 'zustand';
import type { GameEvent, GameState } from '@cards/shared';
import { formatEvent } from '@cards/shared';

export type LogEntryType = 'deploy' | 'attack' | 'item' | 'end-turn' | 'ko' | 'system';

export interface LogEntry {
  id: number;
  turn: number;
  player: string;
  text: string;
  type: LogEntryType;
  timestamp: number;
}

let nextId = 0;

interface LogStore {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  addFromEvent: (state: GameState, event: GameEvent) => void;
  addFromEvents: (state: GameState, events: GameEvent[]) => void;
  clear: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  entries: [],
  addEntry: (entry) =>
    set((s) => ({
      entries: [...s.entries, { ...entry, id: nextId++, timestamp: Date.now() }],
    })),
  addFromEvent: (state, event) => {
    const mapped = mapEventToEntry(state, event);
    if (!mapped) return;
    set((s) => ({
      entries: [...s.entries, { ...mapped, id: nextId++, timestamp: Date.now() }],
    }));
  },
  addFromEvents: (state, events) => {
    const mapped = events
      .map((e) => mapEventToEntry(state, e))
      .filter((entry): entry is Omit<LogEntry, 'id' | 'timestamp'> => entry !== null);
    if (mapped.length === 0) return;
    set((s) => ({
      entries: [
        ...s.entries,
        ...mapped.map((entry) => ({ ...entry, id: nextId++, timestamp: Date.now() })),
      ],
    }));
  },
  clear: () => set({ entries: [] }),
}));

function mapEventToEntry(
  state: GameState,
  event: GameEvent,
): Omit<LogEntry, 'id' | 'timestamp'> | null {
  const turn = state.turnNumber;
  const player = state.players[state.currentPlayerIndex].name;
  switch (event.kind) {
    case 'unit_deployed':
    case 'weapon_equipped':
      return { turn, player, type: 'deploy', text: formatEvent(event) };
    case 'support_activated':
    case 'support_duplicate_discarded':
    case 'item_played':
      return { turn, player, type: 'item', text: formatEvent(event) };
    case 'unit_damaged':
      return { turn, player, type: 'attack', text: formatEvent(event) };
    case 'unit_ko':
      return { turn, player, type: 'ko', text: formatEvent(event) };
    case 'cards_drawn':
      return { turn, player, type: 'deploy', text: formatEvent(event) };
    case 'turn_ended':
      return { turn, player, type: 'end-turn', text: formatEvent(event) };
    case 'game_won':
      return { turn, player, type: 'system', text: formatEvent(event) };
    case 'unit_healed':
    case 'unit_buffed':
    case 'unit_moved':
    case 'card_discarded':
    case 'energy_changed':
      return null;
  }
}
