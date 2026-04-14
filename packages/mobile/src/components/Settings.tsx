import { useState, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  getDisplayName,
  setDisplayName,
  getPlayerId,
  clearIdentity,
} from '../lib/identity';
import {
  getHapticsEnabled,
  setHapticsEnabled,
  getServerUrlOverride,
  setServerUrlOverride,
  clearServerUrlOverride,
} from '../lib/settings';
import { resetTutorial } from '../lib/firstTime';
import { getStats, clearStats, formatRecord } from '../lib/stats';
import { getSocket, disconnectSocket } from '../store/socket';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export function Settings({
  onClose,
  onIdentityChanged,
}: {
  onClose: () => void;
  /** Fires after display name or identity reset, so the menu can refresh its header. */
  onIdentityChanged: () => void;
}) {
  const [name, setName] = useState(getDisplayName());
  const [serverUrl, setServerUrl] = useState(getServerUrlOverride() ?? '');
  const [haptics, setHaptics] = useState(getHapticsEnabled());
  const [stats, setStats] = useState(getStats());
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>(
    'idle',
  );
  const [testError, setTestError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyPlayerId = () => {
    Clipboard.setStringAsync(getPlayerId())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const tryHaptic = () => {
    // Fires regardless of the saved setting so it can function as a preview.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const testConnection = () => {
    setTestState('testing');
    setTestError(null);
    // Fresh socket so we respect the latest override, then tear it down.
    disconnectSocket();
    const socket = getSocket();
    const done = (ok: boolean, err?: string) => {
      socket.off('connect');
      socket.off('connect_error');
      setTestState(ok ? 'ok' : 'fail');
      setTestError(err ?? null);
      disconnectSocket();
    };
    socket.once('connect', () => done(true));
    socket.once('connect_error', (err: Error) =>
      done(false, err.message || 'Connection failed'),
    );
    // Safety timeout — socket.io may sit in reconnect mode forever otherwise.
    const timer = setTimeout(() => {
      if (!socket.connected) done(false, 'Timed out after 5s');
    }, 5000);
    socket.once('connect', () => clearTimeout(timer));
    socket.connect();
  };

  const commitName = (value: string) => {
    const clean = value.trim().slice(0, 20);
    if (!clean) return;
    setDisplayName(clean);
    setName(clean);
    onIdentityChanged();
  };

  const commitServerUrl = (value: string) => {
    setServerUrlOverride(value);
    setServerUrl(value);
  };

  const toggleHaptics = (next: boolean) => {
    setHaptics(next);
    setHapticsEnabled(next);
  };

  const resetIdentity = () => {
    Alert.alert(
      'Reset identity?',
      'This wipes your player ID and display name. Your progress persists only in this device, so there is nothing to recover afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearIdentity();
            setName(getDisplayName());
            onIdentityChanged();
          },
        },
      ],
    );
  };

  const replayTutorial = () => {
    resetTutorial();
    Alert.alert(
      'Tutorial reset',
      'The tutorial will show again next time you open the menu.',
    );
  };

  const playerId = getPlayerId();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>Settings</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={s.close}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }}>
            <Section title="Identity">
              <Field label="Display name">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onBlur={() => commitName(name)}
                  onSubmitEditing={() => commitName(name)}
                  maxLength={20}
                  style={s.input}
                  placeholderTextColor="#6b7280"
                />
              </Field>
              <Pressable onPress={copyPlayerId} style={s.infoRow}>
                <Text style={s.rowLabel}>Player ID</Text>
                <Text
                  style={[s.rowValue, { fontFamily: 'Menlo' }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {playerId}
                </Text>
                <Text style={s.copyHint}>{copied ? 'copied' : 'copy'}</Text>
              </Pressable>
              <Pressable style={s.dangerBtn} onPress={resetIdentity}>
                <Text style={s.dangerText}>Reset identity</Text>
              </Pressable>
            </Section>

            <Section title="Feedback">
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Haptic feedback</Text>
                  <Text style={s.rowHint}>
                    Vibrate on deploy, attack, KO, and other events.
                  </Text>
                </View>
                <Switch
                  value={haptics}
                  onValueChange={toggleHaptics}
                  trackColor={{ false: '#374151', true: '#f59e0b' }}
                  thumbColor="#f5f5f5"
                />
              </View>
              <Pressable style={s.ghostBtn} onPress={tryHaptic}>
                <Text style={s.ghostText}>Try haptic</Text>
              </Pressable>
            </Section>

            <Section title="Online multiplayer">
              <Field label="Server URL">
                <TextInput
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  onBlur={() => commitServerUrl(serverUrl)}
                  placeholder="http://10.0.2.2:3001"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={s.input}
                  placeholderTextColor="#6b7280"
                />
                <Text style={s.rowHint}>
                  Override the baked-in server address. Leave empty to use the
                  default.
                </Text>
              </Field>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[s.ghostBtn, { flex: 1 }]}
                  onPress={() => {
                    clearServerUrlOverride();
                    setServerUrl('');
                    setTestState('idle');
                  }}
                >
                  <Text style={s.ghostText}>Clear override</Text>
                </Pressable>
                <Pressable
                  style={[s.ghostBtn, { flex: 1 }]}
                  onPress={testConnection}
                  disabled={testState === 'testing'}
                >
                  <Text style={s.ghostText}>
                    {testState === 'testing' ? 'Testing...' : 'Test connection'}
                  </Text>
                </Pressable>
              </View>
              {testState === 'ok' && (
                <Text style={s.testOk}>✓ Connected successfully</Text>
              )}
              {testState === 'fail' && (
                <Text style={s.testFail}>✗ {testError}</Text>
              )}
            </Section>

            <Section title="Stats">
              <Row label="vs AI" value={formatRecord(stats.ai)} />
              <Row label="Local 2P" value={formatRecord(stats.local)} />
              <Row label="Online" value={formatRecord(stats.online)} />
              <Row
                label="Fastest win"
                value={
                  stats.fastestWinTurns
                    ? `${stats.fastestWinTurns} turns`
                    : '—'
                }
              />
              <Row
                label="Total turns played"
                value={String(stats.totalTurnsPlayed)}
              />
              <Pressable
                style={s.ghostBtn}
                onPress={() => {
                  Alert.alert('Clear stats?', 'Wipes your win/loss record.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => {
                        clearStats();
                        setStats(getStats());
                      },
                    },
                  ]);
                }}
              >
                <Text style={s.ghostText}>Clear stats</Text>
              </Pressable>
            </Section>

            <Section title="About">
              <Row
                label="Version"
                value={Constants.expoConfig?.version ?? 'dev'}
              />
              <Row
                label="Package"
                value={Constants.expoConfig?.android?.package ?? '—'}
                mono
              />
            </Section>

            <Section title="Help">
              <Pressable style={s.ghostBtn} onPress={replayTutorial}>
                <Text style={s.ghostText}>Replay tutorial on next menu visit</Text>
              </Pressable>
            </Section>
          </ScrollView>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text
        style={[s.rowValue, mono && { fontFamily: 'Menlo' }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 16,
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  close: { color: '#9ca3af', fontSize: 14 },
  section: { gap: 10 },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  rowLabel: { color: '#fff', fontSize: 14 },
  rowHint: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  rowValue: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1, textAlign: 'right' },
  input: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  ghostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  ghostText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  testOk: { color: '#34d399', fontSize: 12 },
  testFail: { color: '#fca5a5', fontSize: 12 },
  copyHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginLeft: 8,
  },
});
