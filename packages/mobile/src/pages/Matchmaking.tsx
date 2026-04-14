import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useGameStore } from '../store/gameStore';

export function Matchmaking() {
  const { queuePosition, leaveQueue, connectionStatus, connectionError } =
    useGameStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
    : `${seconds}s`;
  const isLong = elapsed > 30;

  const statusText =
    connectionStatus === 'error'
      ? connectionError || 'Connection failed'
      : connectionStatus === 'connecting'
      ? 'Connecting to server...'
      : queuePosition > 0
      ? `Position in queue: ${queuePosition}`
      : 'Waiting for opponent...';

  const isError = connectionStatus === 'error';

  return (
    <View style={styles.container}>
      {isError ? (
        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
      ) : (
        <ActivityIndicator size="large" color="#a855f7" />
      )}
      <View style={styles.textGroup}>
        <Text style={styles.title}>
          {isError ? "Can't reach server" : 'Finding Opponent'}
        </Text>
        <Text style={[styles.subtitle, isError && styles.errorText]}>
          {statusText}
        </Text>
        {!isError && (
          <Text style={[styles.elapsed, isLong && styles.elapsedLong]}>
            Waiting {timeStr}
          </Text>
        )}
        {isError && (
          <Text style={styles.hint}>
            Check the server URL in Settings, or ensure the server is running.
          </Text>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        onPress={leaveQueue}
      >
        <Text style={styles.cancelText}>
          {isError ? 'Back' : 'Cancel'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#0b0d12',
    padding: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  textGroup: { alignItems: 'center', gap: 4, maxWidth: 320 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: { color: '#fca5a5' },
  elapsed: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 },
  elapsedLong: { color: '#fbbf24' },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },
  cancelBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  cancelText: { color: '#d1d5db', fontSize: 14 },
});
