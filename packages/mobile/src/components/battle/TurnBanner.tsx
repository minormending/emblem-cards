import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function TurnBanner({
  playerName,
  turnNumber,
  isMyTurn,
}: {
  playerName: string;
  turnNumber: number;
  isMyTurn: boolean;
}) {
  // Brief green pulse the moment the turn flips to the player — gives a
  // visible cue that the AI/opponent finished and it's their move.
  const flash = useSharedValue(0);
  const wasMyTurn = useRef(isMyTurn);

  useEffect(() => {
    if (isMyTurn && !wasMyTurn.current) {
      flash.value = withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }),
      );
    }
    wasMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(52,211,153,${Math.round(flash.value * 250) / 1000})`,
    paddingHorizontal: 6 + flash.value * 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: -6,
  }));

  return (
    <Animated.View style={animStyle}>
      <Animated.Text style={styles.turn}>Turn {turnNumber}</Animated.Text>
      <Animated.Text
        style={[styles.who, { color: isMyTurn ? '#34d399' : '#f87171' }]}
      >
        {isMyTurn ? 'Your turn' : `${playerName}'s turn`}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  turn: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  who: { fontSize: 13, fontWeight: '700' },
});
