import { View, Text, Pressable, Share, StyleSheet } from 'react-native';
import { formatRecord, getStats } from '../../lib/stats';
import { Confetti } from './Confetti';

export function WinnerScreen({
  didWin,
  winnerName,
  turnCount,
  onBackToMenu,
  onRematch,
  mode,
}: {
  didWin: boolean;
  winnerName: string;
  turnCount: number;
  onBackToMenu: () => void;
  /** Omit to hide — online mode has no local rematch path. */
  onRematch?: () => void;
  mode: 'ai' | 'local' | 'online';
}) {
  // Stats are already updated for this game by the time this renders
  // (useRecordOutcome runs before the WinnerScreen is shown to the user).
  const stats = getStats();
  const record = stats[mode];

  const share = () => {
    const modeLabel =
      mode === 'ai' ? 'the AI' : mode === 'local' ? 'a friend' : 'online';
    const result = didWin ? 'Won' : 'Lost';
    const message =
      `${result} a match of Emblem Cards against ${modeLabel} in ${turnCount} turns. ` +
      `Current record vs ${mode}: ${formatRecord(record)}.`;
    Share.share({ message }).catch(() => {
      // User cancelled or share unavailable — no-op. Errors bubble only from
      // platform-level share sheet failures, which aren't actionable here.
    });
  };
  return (
    <View style={styles.container}>
      {didWin && <Confetti />}
      <Text style={[styles.headline, didWin ? styles.win : styles.loss]}>
        {didWin ? 'VICTORY' : 'DEFEAT'}
      </Text>
      <Text style={styles.subtitle}>{winnerName} won</Text>
      <Text style={styles.meta}>Turn {turnCount}</Text>
      <View style={styles.recordRow}>
        <Text style={styles.recordLabel}>
          {mode === 'ai' ? 'vs AI' : mode === 'local' ? 'Local 2P' : 'Online'}
        </Text>
        <Text style={styles.recordValue}>{formatRecord(record)}</Text>
      </View>
      <View style={styles.btnRow}>
        {onRematch && (
          <Pressable style={[styles.btn, styles.rematchBtn]} onPress={onRematch}>
            <Text style={[styles.btnText, { color: '#0b0d12' }]}>Rematch</Text>
          </Pressable>
        )}
        <Pressable style={styles.btn} onPress={onBackToMenu}>
          <Text style={styles.btnText}>Back to Menu</Text>
        </Pressable>
      </View>
      <Pressable style={styles.shareBtn} onPress={share}>
        <Text style={styles.shareText}>Share result</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0d12',
    padding: 24,
  },
  headline: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
  },
  win: { color: '#fbbf24' },
  loss: { color: '#ef4444' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  meta: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  recordRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  recordValue: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rematchBtn: { backgroundColor: '#fbbf24' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 18 },
  shareText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
});
