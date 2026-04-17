import { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useGameStore } from '../store/gameStore';

/**
 * Route Android's hardware back button to screen-aware navigation.
 *
 * Rules:
 *   - menu: let the OS handle it (quit to home screen)
 *   - deck-builder: go back to menu
 *   - matchmaking: leave queue (back to deck-builder)
 *   - battle: confirm before quitting — the engine holds live state and we
 *     don't want a stray back-press to trash a match.
 *
 * iOS doesn't have a hardware back button, but this hook is a no-op there
 * (BackHandler's remove() handles it).
 */
export function useBackHandler(): void {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const store = useGameStore.getState();
      if (store.screen === 'menu') return false;
      if (store.screen === 'mode-select') {
        store.setScreen('menu');
        return true;
      }
      if (store.screen === 'deck-builder') {
        store.setScreen(
          store.mode === 'tournament' ? 'tournament-pre-match' : 'menu',
        );
        return true;
      }
      if (store.screen === 'tournament-home') {
        store.setScreen('menu');
        return true;
      }
      if (store.screen === 'tournament-pre-match') {
        store.setScreen('tournament-home');
        return true;
      }
      if (
        store.screen === 'tournament-reward' ||
        store.screen === 'tournament-loss'
      ) {
        // Same flow as tapping the primary button — return to the ladder.
        store.setCurrentOpponent(null);
        store.setMode('tournament');
        store.setScreen('tournament-home');
        return true;
      }
      if (store.screen === 'matchmaking') {
        store.leaveQueue();
        return true;
      }
      if (store.screen === 'battle') {
        if (store.gameState?.winner || store.gameView?.winner) {
          store.exitGame();
          return true;
        }
        Alert.alert(
          'Quit match?',
          'You will forfeit the current game.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Quit',
              style: 'destructive',
              onPress: () => store.exitGame(),
            },
          ],
        );
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);
}
