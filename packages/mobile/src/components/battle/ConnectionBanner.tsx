import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/gameStore';

/**
 * Persistent warning banner when an online game has lost its socket. Shows
 * only in online mode — local and AI modes don't need it since they have no
 * network dependency. Currently surfaces a Quit action because the engine
 * doesn't yet support session resume; when that lands we can add Reconnect.
 */
export function ConnectionBanner() {
  const mode = useGameStore((s) => s.mode);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const connectionError = useGameStore((s) => s.connectionError);
  const exitGame = useGameStore((s) => s.exitGame);

  if (mode !== 'online') return null;
  if (connectionStatus !== 'error') return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Connection lost</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {connectionError ?? 'Disconnected from server'}
        </Text>
      </View>
      <Pressable style={styles.btn} onPress={exitGame}>
        <Text style={styles.btnText}>Quit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(127,29,29,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248,113,113,0.5)',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  title: { color: '#fff', fontSize: 12, fontWeight: '700' },
  subtitle: { color: '#fecaca', fontSize: 11 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
  },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
