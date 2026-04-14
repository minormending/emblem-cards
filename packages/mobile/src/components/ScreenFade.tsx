import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { ReactNode } from 'react';

/**
 * Crossfade + slight upward drift on screen change. Keyed by `screenKey`
 * in App, so remount triggers the entry animation.
 */
export function ScreenFade({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
