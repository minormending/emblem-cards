import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { getCardById } from '@cards/card-engine';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../lib/sounds';

/**
 * Post-victory card reveal. Uses the Animated API with a simple opacity +
 * scale tween so the new card feels earned without pulling in reanimated.
 */
export function TournamentReward() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setMode = useGameStore((s) => s.setMode);
  const setCurrentOpponent = useGameStore((s) => s.setCurrentOpponent);
  const opponent = useGameStore((s) => s.currentOpponent);

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale]);

  const reward = opponent ? getCardById(opponent.rewardCardId) : undefined;

  const onContinue = () => {
    sfx.select();
    setCurrentOpponent(null);
    // Clear battle-mode state so the home screen is a clean slate.
    setMode('tournament');
    setScreen('tournament-home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>VICTORY</Text>
      {opponent && (
        <Text style={styles.subtitle}>You defeated {opponent.displayName}</Text>
      )}

      <Animated.View
        style={[
          styles.cardBox,
          { opacity: fade, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.newLabel}>New card unlocked</Text>
        {reward ? (
          <>
            <Text style={styles.cardName}>{reward.name}</Text>
            <Text style={styles.cardType}>{reward.type}</Text>
            <Text style={styles.cardCost}>Cost {reward.cost}</Text>
          </>
        ) : (
          <Text style={styles.cardName}>(reward unavailable)</Text>
        )}
      </Animated.View>

      <Pressable style={styles.btn} onPress={onContinue}>
        <Text style={styles.btnText}>Add to Collection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  headline: {
    color: '#fbbf24',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 6,
  },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: -12 },
  cardBox: {
    width: 240,
    padding: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.6)',
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.4,
  },
  newLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  cardName: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'center',
  },
  cardType: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardCost: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
  },
  btnText: { color: '#0b0d12', fontWeight: '900', fontSize: 14 },
});
