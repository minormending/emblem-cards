import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { FieldPosition } from '@cards/shared';
import { useFxStore, type FxSide, type CombatFx as Fx } from '../../store/fxStore';
import { attackTypeHex } from '../../lib/colors';

/**
 * Rises a damage number above the hit slot and fades it out. Driven by
 * fxStore entries spawned from unit_damaged events. One DamageNumber per
 * (side, pos) — stacking is rare enough we don't worry about it.
 */
export function CombatFx({
  side,
  pos,
}: {
  side: FxSide;
  pos: FieldPosition;
}) {
  const fx = useFxStore((s) =>
    s.effects.find(
      (e) => e.side === side && e.pos.row === pos.row && e.pos.col === pos.col,
    ),
  );
  if (!fx) return null;
  return <DamageNumber key={fx.id} fx={fx} />;
}

function DamageNumber({ fx }: { fx: Fx }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 250 }),
    );
    translateY.value = withTiming(-40, {
      duration: 650,
      easing: Easing.out(Easing.quad),
    });
    scale.value = withSequence(
      withTiming(1.2, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120 }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const color = fx.attackType ? attackTypeHex[fx.attackType] : '#f87171';

  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="none">
      <Animated.Text style={[styles.text, { color }]}>
        {fx.isCounter ? '↺ ' : ''}-{fx.amount}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    zIndex: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
