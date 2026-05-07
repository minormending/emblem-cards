import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function Toast({ message }: { message: string | null }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (message) {
      opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(-12, { duration: 150 });
    }
  }, [message]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;
  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="none">
      <Animated.View style={styles.toast}>
        <Animated.Text style={styles.text}>{message}</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
