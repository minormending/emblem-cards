import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Card } from '@cards/shared';
import { getCardById } from '@cards/card-engine';
import { useGameStore } from '../store/gameStore';
import { useTournamentStore } from '../store/tournamentStore';
import { sfx } from '../lib/sounds';

/**
 * Opponent brief + reward preview. The player can open the deck builder
 * (restricted to starter pool + unlocked rewards) or jump straight into the
 * fight if a tournament deck is already saved.
 */
export function TournamentPreMatch() {
  const setScreen = useGameStore((s) => s.setScreen);
  const startTournamentBattle = useGameStore((s) => s.startTournamentBattle);
  const opponent = useGameStore((s) => s.currentOpponent);
  const tournamentDeck = useTournamentStore((s) => s.tournamentDeck);

  if (!opponent) {
    // Defensive — shouldn't happen in practice because the home screen always
    // sets currentOpponent before routing here.
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>No opponent selected.</Text>
        <Pressable onPress={() => setScreen('tournament-home')}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const reward: Card | undefined = getCardById(opponent.rewardCardId);

  const hasDeck = tournamentDeck !== null && tournamentDeck.length > 0;

  const onBuild = () => {
    sfx.select();
    setScreen('deck-builder');
  };

  const onFight = () => {
    if (!hasDeck) return;
    sfx.select();
    startTournamentBattle(opponent);
  };

  const onBack = () => {
    sfx.select();
    setScreen('tournament-home');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.tier}>Tier {opponent.order}</Text>
      </View>

      <View style={styles.portraitBlock}>
        <View style={styles.portrait}>
          <Text style={styles.portraitLetter}>
            {opponent.displayName.charAt(0)}
          </Text>
        </View>
        <Text style={styles.name}>{opponent.displayName}</Text>
        <View style={styles.archBadge}>
          <Text style={styles.archText}>{opponent.archetype}</Text>
        </View>
        <Text style={styles.blurb}>{opponent.blurb}</Text>
        <Text style={styles.aiLabel}>AI: {opponent.ai}</Text>
      </View>

      <View style={styles.rewardBlock}>
        <Text style={styles.sectionLabel}>Reward</Text>
        {reward ? (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardName}>{reward.name}</Text>
            <Text style={styles.rewardType}>{reward.type}</Text>
          </View>
        ) : (
          <View style={styles.rewardCardBack}>
            <Text style={styles.rewardBackText}>?</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={onBuild}>
          <Text style={styles.secondaryText}>
            {hasDeck ? 'Edit Deck' : 'Build Deck'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, !hasDeck && styles.primaryDisabled]}
          onPress={onFight}
          disabled={!hasDeck}
        >
          <Text
            style={[
              styles.primaryText,
              !hasDeck && { color: 'rgba(255,255,255,0.4)' },
            ]}
          >
            Fight!
          </Text>
        </Pressable>
      </View>
      {!hasDeck && (
        <Text style={styles.hint}>
          Build a deck before you can fight.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d12', paddingTop: 44 },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#9ca3af', fontSize: 12 },
  tier: { color: '#fbbf24', fontWeight: '800', fontSize: 12 },
  portraitBlock: { alignItems: 'center', gap: 8 },
  portrait: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.5)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitLetter: { color: '#fbbf24', fontSize: 40, fontWeight: '900' },
  name: { color: '#fff', fontSize: 22, fontWeight: '900' },
  archBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.4)',
    borderWidth: 1,
  },
  archText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  blurb: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 6,
  },
  aiLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  rewardBlock: {
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rewardCard: {
    width: 140,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.5)',
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  rewardName: { color: '#fbbf24', fontWeight: '800', fontSize: 13 },
  rewardType: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardCardBack: {
    width: 140,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBackText: { color: 'rgba(255,255,255,0.3)', fontSize: 36, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  primaryDisabled: { backgroundColor: '#374151' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  hint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  missing: {
    color: 'rgba(255,255,255,0.7)',
    padding: 24,
    textAlign: 'center',
  },
});
