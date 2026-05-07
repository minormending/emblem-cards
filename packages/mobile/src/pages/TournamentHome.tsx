import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Card, TournamentOpponent } from '@cards/shared';
import { OPPONENTS } from '@cards/shared';
import { getCardById } from '@cards/card-engine';
import { useGameStore } from '../store/gameStore';
import { useTournamentStore } from '../store/tournamentStore';
import { sfx } from '../lib/sounds';

/**
 * Tournament ladder + unlocked-card collection. Mirror of the web
 * TournamentHome page, rendered with native components.
 */
export function TournamentHome() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setCurrentOpponent = useGameStore((s) => s.setCurrentOpponent);
  const currentRound = useTournamentStore((s) => s.currentRound);
  const unlockedCards = useTournamentStore((s) => s.unlockedCards);
  const replay = useTournamentStore((s) => s.replay);
  const reset = useTournamentStore((s) => s.reset);

  const unlockedCardObjects = useMemo<Card[]>(() => {
    const out: Card[] = [];
    for (const id of unlockedCards) {
      const c = getCardById(id);
      if (c) out.push(c);
    }
    return out;
  }, [unlockedCards]);

  const champion = currentRound >= 8;

  const onPickOpponent = (opp: TournamentOpponent) => {
    sfx.select();
    setCurrentOpponent(opp);
    setScreen('tournament-pre-match');
  };

  const onReplay = async () => {
    sfx.select();
    await replay();
  };

  const onReset = () => {
    Alert.alert(
      'Reset Tournament?',
      'This wipes all tournament progress AND unlocked cards. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await reset();
          },
        },
      ],
    );
  };

  const onBack = () => {
    sfx.select();
    setScreen('menu');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Tournament</Text>
        <Text style={styles.progress}>{Math.min(currentRound, 8)} / 8</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {champion && (
          <View style={styles.championBanner}>
            <Text style={styles.championText}>Champion!</Text>
            <Text style={styles.championSub}>
              You've cleared the ladder. Replay to reset progress (unlocks
              stick).
            </Text>
          </View>
        )}

        <View style={styles.ladder}>
          {OPPONENTS.map((opp) => {
            const defeated = opp.order <= currentRound;
            const unlocked = opp.order <= currentRound + 1 && opp.order <= 8;
            const isNext = opp.order === currentRound + 1 && !champion;
            return (
              <OpponentRow
                key={opp.id}
                opp={opp}
                defeated={defeated}
                unlocked={unlocked}
                isNext={isNext}
                onPress={unlocked ? () => onPickOpponent(opp) : undefined}
              />
            );
          })}
        </View>

        <View style={styles.collectionBlock}>
          <Text style={styles.sectionLabel}>
            Collection ({unlockedCards.length} / 8)
          </Text>
          {unlockedCardObjects.length === 0 ? (
            <Text style={styles.collectionEmpty}>
              Beat opponents to unlock cards.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {unlockedCardObjects.map((card) => (
                <View key={card.id} style={styles.collectionCard}>
                  <Text style={styles.collectionName} numberOfLines={2}>
                    {card.name}
                  </Text>
                  <Text style={styles.collectionType}>{card.type}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.footerActions}>
          {champion && (
            <Pressable style={styles.replayBtn} onPress={onReplay}>
              <Text style={styles.replayText}>Replay Tournament</Text>
            </Pressable>
          )}
          <Pressable style={styles.resetBtn} onPress={onReset}>
            <Text style={styles.resetText}>Reset Tournament</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function OpponentRow({
  opp,
  defeated,
  unlocked,
  isNext,
  onPress,
}: {
  opp: TournamentOpponent;
  defeated: boolean;
  unlocked: boolean;
  isNext: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!unlocked}
      style={({ pressed }) => [
        styles.row,
        !unlocked && styles.rowLocked,
        isNext && styles.rowNext,
        defeated && styles.rowDefeated,
        pressed && unlocked && { opacity: 0.8 },
      ]}
    >
      <View style={styles.tierBadge}>
        <Text style={styles.tierText}>{opp.order}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowName, !unlocked && { opacity: 0.5 }]}>
          {opp.displayName}
        </Text>
        <Text style={styles.rowArchetype}>{opp.archetype}</Text>
      </View>
      <View style={styles.status}>
        {defeated ? (
          <Text style={styles.statusDone}>Defeated</Text>
        ) : isNext ? (
          <Text style={styles.statusNext}>Next</Text>
        ) : (
          <Text style={styles.statusLocked}>Locked</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d12', paddingTop: 44 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  back: { color: '#9ca3af', fontSize: 12 },
  title: { color: '#fbbf24', fontSize: 20, fontWeight: '800' },
  progress: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 18, paddingBottom: 40 },
  championBanner: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.5)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  championText: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  championSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 4,
  },
  ladder: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowLocked: { opacity: 0.5 },
  rowNext: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  rowDefeated: {
    borderColor: 'rgba(52,211,153,0.4)',
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  tierBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251,191,36,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: { color: '#fbbf24', fontWeight: '900', fontSize: 14 },
  rowName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowArchetype: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  status: { minWidth: 64, alignItems: 'flex-end' },
  statusDone: { color: '#34d399', fontWeight: '700', fontSize: 11 },
  statusNext: { color: '#fbbf24', fontWeight: '700', fontSize: 11 },
  statusLocked: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  collectionBlock: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  collectionEmpty: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  collectionCard: {
    width: 96,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 8,
  },
  collectionName: { color: '#fbbf24', fontWeight: '700', fontSize: 11 },
  collectionType: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerActions: { gap: 8, marginTop: 8 },
  replayBtn: {
    paddingVertical: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    alignItems: 'center',
  },
  replayText: { color: '#0b0d12', fontWeight: '800', fontSize: 14 },
  resetBtn: {
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 10,
    alignItems: 'center',
  },
  resetText: { color: '#fca5a5', fontWeight: '700', fontSize: 12 },
});
