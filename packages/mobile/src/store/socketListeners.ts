import type { GameSocket } from './socket';
import type { useGameStore } from './gameStore';
import { spawnPlayedFromEvents } from './spawnPlayed';
import { getPlayerId } from '../lib/identity';

type StoreApi = typeof useGameStore;

export function attachSocketListeners(socket: GameSocket, store: StoreApi): void {
  socket.off('queue:joined');
  socket.off('game:start');
  socket.off('game:update');
  socket.off('game:error');
  socket.off('game:action-result');
  socket.off('game:over');
  socket.off('auth:ok');
  socket.off('auth:error');
  socket.off('disconnect');
  socket.off('room:created');
  socket.off('room:error');

  socket.on('disconnect', () => {
    store.setState({ connectionStatus: 'error', connectionError: 'Disconnected' });
  });

  socket.on('queue:joined', ({ position }) => {
    store.setState({ queuePosition: position });
  });
  socket.on('game:start', (view) => {
    store.setState({ gameView: view, screen: 'battle' });
  });
  socket.on('game:update', (view) => {
    store.setState({ gameView: view });
  });
  socket.on('game:error', (message) => {
    store.getState().showMessage(message);
  });
  socket.on('game:action-result', (result) => {
    if (result.type === 'attack' && result.damage != null) {
      store.getState().showMessage(`${result.damage} damage!`);
    }
    if (result.events && result.events.length > 0) {
      const side = result.actorId === getPlayerId() ? 'own' : 'enemy';
      spawnPlayedFromEvents(result.events, side);
    }
  });
  socket.on('game:over', ({ stats }) => {
    store.setState({ matchStats: stats });
  });

  socket.on('room:created', ({ code }) => {
    store.setState({ roomCode: code });
  });

  socket.on('room:error', (message) => {
    store.getState().showMessage(message);
    store.setState({ screen: 'deck-builder', roomRole: null, roomCode: null });
  });
}
