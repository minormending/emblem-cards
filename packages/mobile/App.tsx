import { useEffect, useState } from 'react';
import { View, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/gameStore';
import { useTournamentStore } from './src/store/tournamentStore';
import { Menu } from './src/pages/Menu';
import { ModeSelect } from './src/pages/ModeSelect';
import { DeckBuilder } from './src/pages/DeckBuilder';
import { Matchmaking } from './src/pages/Matchmaking';
import { Battle } from './src/pages/Battle';
import { TournamentHome } from './src/pages/TournamentHome';
import { TournamentPreMatch } from './src/pages/TournamentPreMatch';
import { TournamentReward } from './src/pages/TournamentReward';
import { TournamentLoss } from './src/pages/TournamentLoss';
import { STARTER_POOL } from '@cards/shared';
import { hydrateStorage } from './src/lib/storage';
import { IDENTITY_KEYS } from './src/lib/identity';
import { FIRST_TIME_KEYS } from './src/lib/firstTime';
import { SETTINGS_KEYS } from './src/lib/settings';
import { STATS_KEYS } from './src/lib/stats';
import { useBackHandler } from './src/hooks/useBackHandler';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ScreenFade } from './src/components/ScreenFade';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const [hydrated, setHydrated] = useState(false);
  useBackHandler();

  useEffect(() => {
    hydrateStorage([
      ...IDENTITY_KEYS,
      ...FIRST_TIME_KEYS,
      ...SETTINGS_KEYS,
      ...STATS_KEYS,
    ])
      // Decks live in a separate JSON blob, not the sync cache — hydrate
      // them into the store before we render so DeckBuilder sees saved state.
      .then(() => useGameStore.getState().hydrateDecks())
      // Tournament progress has its own AsyncStorage slot; hydrate before we
      // render so the home screen shows the correct currentRound / unlocks.
      .then(() => useTournamentStore.getState().hydrate())
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  // Tournament deck builder sees only starter-pool + reward-unlocked cards.
  // Derive the filter in render so new unlocks propagate immediately after
  // the reward screen commits them to the store.
  const unlockedCards = useTournamentStore((s) => s.unlockedCards);
  const mode = useGameStore((s) => s.mode);
  const tournamentPool =
    mode === 'tournament'
      ? new Set<string>([...STARTER_POOL, ...unlockedCards])
      : undefined;

  // Audit H3 parity: if a stale persisted screen value somehow lands
  // (older app version, corrupt AsyncStorage), the inline
  // `screen === 'X' &&` chain below would render nothing — a permanent
  // black screen. Detect after hydration and reset to menu.
  useEffect(() => {
    const knownScreens = [
      'menu',
      'mode-select',
      'deck-builder',
      'matchmaking',
      'battle',
      'tournament-home',
      'tournament-pre-match',
      'tournament-reward',
      'tournament-loss',
    ] as const;
    if (hydrated && !knownScreens.includes(screen as typeof knownScreens[number])) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Unknown screen value, resetting to menu:', screen);
      }
      useGameStore.getState().setScreen('menu');
    }
  }, [hydrated, screen]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <ErrorBoundary onReset={() => useGameStore.getState().exitGame()}>
          <ScreenFade key={screen}>
            {screen === 'menu' && <Menu />}
            {screen === 'mode-select' && <ModeSelect />}
            {screen === 'deck-builder' && (
              <DeckBuilder poolFilter={tournamentPool} />
            )}
            {screen === 'matchmaking' && <Matchmaking />}
            {screen === 'battle' && <Battle />}
            {screen === 'tournament-home' && <TournamentHome />}
            {screen === 'tournament-pre-match' && <TournamentPreMatch />}
            {screen === 'tournament-reward' && <TournamentReward />}
            {screen === 'tournament-loss' && <TournamentLoss />}
          </ScreenFade>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0d12' },
  loading: {
    flex: 1,
    backgroundColor: '#0b0d12',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
