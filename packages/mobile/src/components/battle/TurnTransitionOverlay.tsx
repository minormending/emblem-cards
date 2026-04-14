import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Full-screen curtain shown between turns in local hot-seat mode, so the
 * next player can pick up the device without seeing the previous player's
 * hand. Dismissed by tapping the overlay.
 */
export function TurnTransitionOverlay({
  turnNumber,
  currentPlayerName,
  enabled,
}: {
  turnNumber: number;
  currentPlayerName: string;
  enabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);
  const lastTurn = useRef(turnNumber);

  useEffect(() => {
    if (!enabled) return;
    if (turnNumber === lastTurn.current) return;
    lastTurn.current = turnNumber;
    if (turnNumber <= 1) return;
    setVisible(true);
    opacity.value = withTiming(1, { duration: 200 });
  }, [turnNumber, enabled]);

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => setVisible(false), 160);
  };

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, style]}>
      <Pressable style={styles.inner} onPress={dismiss}>
        <Text style={styles.turn}>Turn {turnNumber}</Text>
        <Text style={styles.name}>{currentPlayerName}</Text>
        <View style={styles.hint}>
          <Text style={styles.hintText}>Tap to continue</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 100,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  turn: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    letterSpacing: 4,
  },
  name: { color: '#fbbf24', fontSize: 42, fontWeight: '900' },
  hint: { marginTop: 24 },
  hintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    letterSpacing: 1,
  },
});
