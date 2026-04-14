// Mobile SFX use haptic feedback instead of audio tones. The web client generates
// chiptune via Web Audio API oscillators, which doesn't translate cleanly to RN
// without bundling pre-rendered audio files. Haptics give mobile players tactile
// feedback that maps well to the game's short, discrete events.
import * as Haptics from 'expo-haptics';
import { getHapticsEnabled } from './settings';

const light = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
const medium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
const heavy = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
const success = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
const warning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
const error = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

const fire = (fn: () => Promise<void>) => {
  if (!getHapticsEnabled()) return;
  fn().catch(() => {});
};

export const sfx = {
  deploy: () => fire(medium),
  attack: () => fire(heavy),
  hit: () => fire(medium),
  ko: () => {
    fire(heavy);
    setTimeout(() => fire(heavy), 100);
  },
  endTurn: () => fire(light),
  draw: () => fire(light),
  error: () => fire(error),
  victory: () => fire(success),
  defeat: () => fire(warning),
  select: () => fire(light),
};
