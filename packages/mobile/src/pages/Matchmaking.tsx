import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useGameStore } from '../store/gameStore';

export function Matchmaking() {
  const {
    queuePosition,
    leaveQueue,
    leaveRoom,
    connectionStatus,
    connectionError,
    roomRole,
    roomCode,
  } = useGameStore();
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr =
    minutes > 0
      ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
      : `${seconds}s`;

  const cancel = () => {
    if (roomRole === 'host' || roomRole === 'guest') leaveRoom();
    else leaveQueue();
  };

  const copyCode = async () => {
    if (!roomCode) return;
    await Clipboard.setStringAsync(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareCode = async () => {
    if (!roomCode) return;
    try {
      await Share.share({
        message: `Join my Emblem Cards game — code: ${roomCode}`,
      });
    } catch {
      // User cancelled share sheet; no-op.
    }
  };

  const isError = connectionStatus === 'error';

  // ── Host: show code + waiting for friend ──
  if (roomRole === 'host' && !isError) {
    return (
      <View style={styles.container}>
        <View style={styles.hostHeader}>
          <Text style={styles.label}>Share this code</Text>
          <Text style={styles.sublabel}>
            Your friend enters it in "Join with Code"
          </Text>
        </View>

        {roomCode ? (
          <Pressable
            onPress={copyCode}
            style={({ pressed }) => [
              styles.codeBox,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.code}>{roomCode}</Text>
            <Text style={styles.codeHint}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
          </Pressable>
        ) : (
          <ActivityIndicator size="large" color="#a855f7" />
        )}

        {roomCode && (
          <Pressable
            onPress={shareCode}
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.shareText}>Share code</Text>
          </Pressable>
        )}

        <View style={styles.textGroup}>
          <Text style={styles.subtitle}>Waiting for opponent…</Text>
          <Text style={styles.elapsed}>{timeStr}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          onPress={cancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── Guest: joining a known code ──
  if (roomRole === 'guest' && !isError) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#a855f7" />
        <View style={styles.textGroup}>
          <Text style={styles.title}>Joining {roomCode}</Text>
          <Text style={styles.subtitle}>Connecting to your friend's room…</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          onPress={cancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── Default: public matchmaking / error ──
  const isLong = elapsed > 30;
  const statusText = isError
    ? connectionError || 'Connection failed'
    : connectionStatus === 'connecting'
      ? 'Connecting to server...'
      : queuePosition > 0
        ? `Position in queue: ${queuePosition}`
        : 'Waiting for opponent...';

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
        onPress={cancel}
      >
        <Text style={styles.cancelText}>{isError ? 'Back' : 'Cancel'}</Text>
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
  dot: { width: 16, height: 16, borderRadius: 8 },
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
  hostHeader: { alignItems: 'center', gap: 4 },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sublabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  codeBox: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,0.5)',
    alignItems: 'center',
  },
  code: {
    color: '#e9d5ff',
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'Menlo',
    letterSpacing: 8,
  },
  codeHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  shareBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#a855f7',
  },
  shareText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
