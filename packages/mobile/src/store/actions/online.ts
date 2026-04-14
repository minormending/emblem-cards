import { getSocket } from '../socket';
import type { useGameStore } from '../gameStore';
import type { GameActions } from './types';

type Store = typeof useGameStore;

export function createOnlineActions(store: Store): GameActions {
  return {
    deploy(handIndex, target) {
      if (!ensureInGame(store)) return;
      getSocket().emit('game:deploy', handIndex, target);
      store.setState({ selectedHandIndex: null });
    },
    attack(from, to) {
      if (!ensureInGame(store)) return;
      getSocket().emit('game:attack', from, to);
      store.setState({ selectedAttackerPos: null });
      store.getState().setLastHitPos(to);
      setTimeout(() => store.getState().setLastHitPos(null), 400);
    },
    endTurn() {
      if (!ensureInGame(store)) return;
      getSocket().emit('game:end-turn');
      store.setState({ selectedHandIndex: null, selectedAttackerPos: null });
    },
  };
}

function ensureInGame(store: Store): boolean {
  const state = store.getState();
  if (!state.gameView) {
    state.showMessage('Not in a game');
    return false;
  }
  if (!getSocket().connected) {
    state.showMessage('Disconnected from server');
    return false;
  }
  return true;
}
