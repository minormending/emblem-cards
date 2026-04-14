import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/**
 * One-shot confetti burst. 40 squares spawn from center, fan out with a
 * randomized horizontal drift, fall with gravity, and fade after ~2s. Pure
 * Reanimated on the UI thread, no extra deps.
 */

const PIECE_COUNT = 40;
const DURATION_MS = 2000;
const COLORS = ['#fbbf24', '#dc2626', '#a855f7', '#10b981', '#3b82f6', '#f97316'];

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = Array.from({ length: PIECE_COUNT }, (_, i) => i);
  return (
    <Animated.View style={styles.wrap} pointerEvents="none">
      {pieces.map((i) => (
        <Piece key={i} index={i} width={width} height={height} />
      ))}
    </Animated.View>
  );
}

function Piece({
  index,
  width,
  height,
}: {
  index: number;
  width: number;
  height: number;
}) {
  // Deterministic per-index jitter so each piece has a stable path.
  const seed = (n: number) => {
    const x = Math.sin(index * 9301 + n * 49297) * 0.5 + 0.5;
    return x - Math.floor(x);
  };
  const color = COLORS[index % COLORS.length];
  const size = 6 + seed(1) * 8;
  const startX = width / 2 + (seed(2) - 0.5) * 40;
  const startY = height / 2 - 40;
  const endX = startX + (seed(3) - 0.5) * width * 1.2;
  const endY = height + 60;
  const rotSpin = (seed(4) - 0.5) * 720;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const x = startX + (endX - startX) * p;
    // Parabolic vertical — up first, then fall.
    const y = startY + (endY - startY) * p - Math.sin(p * Math.PI) * 80;
    const opacity = p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotSpin * p}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size * 1.4,
          backgroundColor: color,
          borderRadius: 1,
          position: 'absolute',
          left: -size / 2,
          top: -size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
