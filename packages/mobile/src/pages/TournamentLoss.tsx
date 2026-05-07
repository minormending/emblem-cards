import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../lib/sounds';

/**
 * Tournament defeat screen. No progression penalty — player can retry the
 * same opponent or return to the ladder.
 */
export function TournamentLoss() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setCurrentOpponent = useGameStore((s) => s.setCurrentOpponent);
  const setMode = useGameStore((s) => s.setMode);
  const opponent = useGameStore((s) => s.currentOpponent);
  const startTournamentBattle = useGameStore((s) => s.startTournamentBattle);

  const onRetry = () => {
    if (!opponent) return;
    sfx.select();
    startTournamentBattle(opponent);
  };

  const onHome = () => {
    sfx.select();
    setCurrentOpponent(null);
    setMode('tournament');
    setScreen('tournament-home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>DEFEATED</Text>
      {opponent && (
        <Text style={styles.subtitle}>{opponent.displayName} stood firm.</Text>
      )}
      <View style={styles.btnRow}>
        {opponent && (
          <Pressable style={styles.primary} onPress={onRetry}>
            <Text style={styles.primaryText}>Retry</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondary} onPress={onHome}>
          <Text style={styles.secondaryText}>Back to Ladder</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
  },
  headline: {
    color: '#ef4444',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 6,
  },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: -8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
  },
  primaryText: { color: '#0b0d12', fontWeight: '900', fontSize: 14 },
  secondary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
  },
  secondaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
