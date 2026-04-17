import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useFxStore, type PlayedCardFx } from '../../store/fxStore';
import { CardView } from '../CardView';

/**
 * Center-screen pop-in for non-unit cards. Each overlay is driven by one
 * Reanimated shared value that runs a pop-hold-fade sequence on mount. The
 * store auto-removes the entry after the duration elapses.
 *
 * pointerEvents="box-none" keeps taps flowing through to the board.
 */
export function CardPlayedOverlay() {
  const playedCards = useFxStore((s) => s.playedCards);
  if (playedCards.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {playedCards.map((fx) => (
        <OneCard key={fx.id} fx={fx} />
      ))}
    </View>
  );
}

function OneCard({ fx }: { fx: PlayedCardFx }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 700 }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
    );
    scale.value = withSequence(
      withTiming(1.05, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 600 }),
      withTiming(0.95, { duration: 240, easing: Easing.in(Easing.quad) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <Text style={styles.label}>{labelFor(fx)}</Text>
      <CardView card={fx.card} />
    </Animated.View>
  );
}

function labelFor(fx: PlayedCardFx): string {
  if (fx.kind === 'item') return 'Item played';
  const side = fx.ownerSide === 'enemy' ? 'Opponent: ' : '';
  return fx.kind === 'weapon' ? `${side}Weapon equipped` : `${side}Support activated`;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    alignItems: 'center',
    gap: 8,
    shadowColor: '#fbbf24',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
