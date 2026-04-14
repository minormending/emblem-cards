import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore, getCurrentPlayer } from '../store/gameStore';
import { getOccupiedPositions } from '@cards/battle-engine';
import {
  hasDoneBattleHints,
  markBattleHintsDone,
  getDismissedHints,
  addDismissedHint,
} from '../lib/firstTime';

interface HintStep {
  id: string;
  title: string;
  body: string;
  isActive: (store: ReturnType<typeof useGameStore.getState>) => boolean;
}

const steps: HintStep[] = [
  {
    id: 'deploy',
    title: 'Step 1: Deploy a unit',
    body: 'Tap a card in your hand, then tap an empty slot on your side to deploy it. Start with a unit in the front row.',
    isActive: (s) => {
      const me = getCurrentPlayer(s);
      if (!me) return false;
      return getOccupiedPositions(me.field).length === 0;
    },
  },
  {
    id: 'end-turn',
    title: 'Step 2: End your turn',
    body: "Units you just deployed can't attack this turn. Tap End Turn (top-right) to pass. You'll draw a card and gain more energy next turn.",
    isActive: (s) => {
      if (!s.gameState) return false;
      const me = getCurrentPlayer(s);
      if (!me) return false;
      return (
        s.gameState.turnNumber === 1 &&
        getOccupiedPositions(me.field).length >= 1
      );
    },
  },
  {
    id: 'attack',
    title: 'Step 3: Attack',
    body: 'Tap your unit on the field, then tap an enemy unit to attack. Units can only attack once per turn.',
    isActive: (s) => {
      if (!s.gameState) return false;
      if (s.gameState.turnNumber < 2) return false;
      const me = getCurrentPlayer(s);
      if (!me) return false;
      const myUnits = getOccupiedPositions(me.field);
      if (myUnits.length === 0) return false;
      return myUnits.some((p) => !me.field[p.row][p.col].hasActed);
    },
  },
  {
    id: 'inspect',
    title: 'Tip: Inspect any card',
    body: 'Long-press any card to see full details. Works for cards in hand, units on the field, or the opponent\'s units.',
    isActive: (s) => !!s.gameState && s.gameState.turnNumber >= 3,
  },
];

export function BattleHints() {
  const store = useGameStore();
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    getDismissedHints(),
  );
  const [enabled] = useState(() => !hasDoneBattleHints());

  useEffect(() => {
    if (!enabled) return;
    if (dismissed.size >= steps.length) markBattleHintsDone();
  }, [dismissed, enabled]);

  if (!enabled) return null;
  if (!store.gameState || store.gameState.winner) return null;
  if (store.mode === 'ai' && store.gameState.currentPlayerIndex !== 0) {
    return null;
  }

  const current = steps.find(
    (step) => !dismissed.has(step.id) && step.isActive(store),
  );
  if (!current) return null;

  const dismiss = () => {
    addDismissedHint(current.id);
    setDismissed((s) => {
      const next = new Set(s);
      next.add(current.id);
      return next;
    });
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>?</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={10}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: 420,
    width: '100%',
    backgroundColor: '#1e3a8a',
    borderColor: 'rgba(59,130,246,0.4)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  title: { color: '#bfdbfe', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  body: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17 },
  close: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});
