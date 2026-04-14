import { useEffect, useState } from 'react';
import { View, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/gameStore';
import { Menu } from './src/pages/Menu';
import { DeckBuilder } from './src/pages/DeckBuilder';
import { Matchmaking } from './src/pages/Matchmaking';
import { Battle } from './src/pages/Battle';
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
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

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
            {screen === 'deck-builder' && <DeckBuilder />}
            {screen === 'matchmaking' && <Matchmaking />}
            {screen === 'battle' && <Battle />}
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
