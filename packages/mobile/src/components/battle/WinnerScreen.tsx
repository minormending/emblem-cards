import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Share,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { MatchStats } from '@cards/shared';
import { formatRecord, getStats } from '../../lib/stats';
import { CardView } from '../CardView';
import { Confetti } from './Confetti';

/**
 * End-of-match screen with staggered reveal. Mobile version — plain opacity
 * transitions rather than reanimated to keep the code size down.
 */
export function WinnerScreen({
  didWin,
  winnerName,
  turnCount,
  onBackToMenu,
  onRematch,
  mode,
  stats,
}: {
  didWin: boolean;
  winnerName: string;
  turnCount: number;
  onBackToMenu: () => void;
  onRematch?: () => void;
  mode: 'ai' | 'local' | 'online';
  stats: MatchStats | null;
}) {
  const [stage, setStage] = useState(0);
  const recordStats = getStats();
  const record = recordStats[mode];

  useEffect(() => {
    const schedule = [400, 800, 1200, 1700];
    const timers = schedule.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const share = () => {
    const modeLabel =
      mode === 'ai' ? 'the AI' : mode === 'local' ? 'a friend' : 'online';
    const result = didWin ? 'Won' : 'Lost';
    const mvpLine = stats?.mvp
      ? ` MVP: ${stats.mvp.unit.name} (${stats.mvp.totalDamage} damage).`
      : '';
    const message =
      `${result} a match of Emblem Cards against ${modeLabel} in ${turnCount} turns.${mvpLine} ` +
      `Record vs ${mode}: ${formatRecord(record)}.`;
    Share.share({ message }).catch(() => {});
  };

  const modifierInfo = stats ? MODIFIER_UI[stats.modifier ?? 'none'] : null;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: '#0b0d12' }}
    >
      {didWin && <Confetti />}

      <View style={[styles.fadeRow, { opacity: stage >= 1 ? 1 : 0 }]}>
        <Text style={[styles.headline, didWin ? styles.win : styles.loss]}>
          {didWin ? 'VICTORY' : 'DEFEAT'}
        </Text>
        <Text style={styles.subtitle}>{winnerName}</Text>
      </View>

      {modifierInfo && (
        <View style={[styles.fadeRow, { opacity: stage >= 2 ? 1 : 0 }]}>
          <View style={[styles.modifierBadge, modifierInfo.badgeStyle]}>
            <Text style={[styles.modifierText, modifierInfo.textStyle]}>
              {modifierInfo.label}
            </Text>
          </View>
        </View>
      )}

      {stats?.mvp && (
        <View style={[styles.fadeRow, { opacity: stage >= 3 ? 1 : 0, gap: 8 }]}>
          <Text style={styles.mvpLabel}>MVP</Text>
          <CardView card={stats.mvp.unit} />
          <Text style={styles.mvpDamage}>
            <Text style={styles.mvpDamageAmount}>
              {stats.mvp.totalDamage}
            </Text>
            {' damage dealt'}
          </Text>
        </View>
      )}

      <View style={[styles.statGrid, { opacity: stage >= 4 ? 1 : 0 }]}>
        {stats?.killingBlow && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Finishing blow</Text>
            <Text style={styles.statValue}>
              {stats.killingBlow.attacker.name} → {stats.killingBlow.defender.name}
            </Text>
          </View>
        )}
        {stats?.biggestHit && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Biggest hit</Text>
            <Text style={styles.statValue}>{stats.biggestHit.amount} dmg</Text>
          </View>
        )}
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Turns</Text>
          <Text style={styles.statValue}>{turnCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>
            {mode === 'ai' ? 'vs AI' : mode === 'local' ? 'Local 2P' : 'Online'}
          </Text>
          <Text style={styles.statValue}>{formatRecord(record)}</Text>
        </View>
      </View>

      <View style={[styles.btnRow, { opacity: stage >= 4 ? 1 : 0 }]}>
        {onRematch && (
          <Pressable style={[styles.btn, styles.rematchBtn]} onPress={onRematch}>
            <Text style={[styles.btnText, { color: '#0b0d12' }]}>Rematch</Text>
          </Pressable>
        )}
        <Pressable style={styles.btn} onPress={onBackToMenu}>
          <Text style={styles.btnText}>Menu</Text>
        </Pressable>
      </View>
      <Pressable style={styles.shareBtn} onPress={share}>
        <Text style={styles.shareText}>Share result</Text>
      </Pressable>
    </ScrollView>
  );
}

const MODIFIER_UI: Record<
  string,
  {
    label: string;
    badgeStyle: object;
    textStyle: object;
  }
> = {
  flawless: {
    label: 'Flawless',
    badgeStyle: { borderColor: 'rgba(251,191,36,0.5)', backgroundColor: 'rgba(251,191,36,0.1)' },
    textStyle: { color: '#fbbf24' },
  },
  comeback: {
    label: 'Comeback',
    badgeStyle: { borderColor: 'rgba(168,85,247,0.5)', backgroundColor: 'rgba(168,85,247,0.1)' },
    textStyle: { color: '#c084fc' },
  },
  close: {
    label: 'Close',
    badgeStyle: { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.1)' },
    textStyle: { color: '#fca5a5' },
  },
  dominant: {
    label: 'Dominant',
    badgeStyle: { borderColor: 'rgba(251,146,60,0.5)', backgroundColor: 'rgba(251,146,60,0.1)' },
    textStyle: { color: '#fdba74' },
  },
  methodical: {
    label: 'Methodical',
    badgeStyle: { borderColor: 'rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.1)' },
    textStyle: { color: '#93c5fd' },
  },
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
    paddingTop: 60,
  },
  fadeRow: { alignItems: 'center', gap: 4 },
  headline: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 4,
  },
  win: { color: '#fbbf24' },
  loss: { color: '#ef4444' },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  modifierBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  modifierText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  mvpLabel: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  mvpDamage: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  mvpDamageAmount: { color: '#fbbf24', fontWeight: '800' },
  statGrid: {
    width: '100%',
    maxWidth: 320,
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rematchBtn: { backgroundColor: '#fbbf24' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  shareText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
});
