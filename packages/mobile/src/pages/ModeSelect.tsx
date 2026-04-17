import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../lib/sounds';

export function ModeSelect() {
  const { setMode, setScreen, quickStart } = useGameStore();
  const [showOnline, setShowOnline] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const nav = (fn: () => void) => () => {
    sfx.select();
    fn();
  };

  const goAI = nav(() => {
    setMode('ai');
    setScreen('deck-builder');
  });
  const goTournament = nav(() => {
    setMode('tournament');
    setScreen('tournament-home');
  });
  const goLocal = nav(() => {
    setMode('local');
    setScreen('deck-builder');
  });
  const goHost = nav(() => {
    setMode('online');
    useGameStore.setState({ roomRole: 'host', roomCode: null });
    setScreen('deck-builder');
  });
  const goOnline = nav(() => {
    setMode('online');
    useGameStore.setState({ roomRole: 'queue', roomCode: null });
    setScreen('deck-builder');
  });
  const goJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) return;
    sfx.select();
    setMode('online');
    useGameStore.setState({ roomRole: 'guest', roomCode: code });
    setScreen('deck-builder');
  };
  const handleQuickStart = nav(quickStart);

  const modes = [
    { name: 'VS AI', brief: 'Build your deck, fight the AI', color: '#3b82f6', action: goAI },
    { name: 'Tournament', brief: '8-opponent ladder, unlock cards', color: '#f59e0b', action: goTournament },
    { name: 'Local Duel', brief: 'Two players, one screen', color: '#6b7280', action: goLocal },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button */}
      <Pressable
        onPress={() => { sfx.select(); setScreen('menu'); }}
        style={styles.backBtn}
        hitSlop={12}
      >
        <Text style={styles.backArrow}>{'\u2039'}</Text>
        <Text style={styles.backText}>Home</Text>
      </Pressable>

      {/* Quick Start banner */}
      <Pressable
        style={({ pressed }) => [styles.quickStart, pressed && styles.pressed]}
        onPress={handleQuickStart}
      >
        <View style={styles.quickStartIcon}>
          <Text style={styles.quickStartIconText}>{'\u25B6'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickStartTitle}>Quick Start</Text>
          <Text style={styles.quickStartSub}>Random decks vs AI — straight to battle</Text>
        </View>
      </Pressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>CHOOSE MODE</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Mode rows */}
      {modes.map((m) => (
        <Pressable
          key={m.name}
          style={({ pressed }) => [styles.modeRow, pressed && styles.pressed]}
          onPress={m.action}
        >
          <View style={[styles.colorBar, { backgroundColor: m.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeName}>{m.name}</Text>
            <Text style={styles.modeBrief}>{m.brief}</Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </Pressable>
      ))}

      {/* Online — expandable */}
      {!showOnline ? (
        <Pressable
          style={({ pressed }) => [styles.modeRow, pressed && styles.pressed]}
          onPress={() => setShowOnline(true)}
        >
          <View style={[styles.colorBar, { backgroundColor: '#a855f7' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeName}>Online</Text>
            <Text style={styles.modeBrief}>Host, join, or find a match</Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </Pressable>
      ) : (
        <View style={styles.onlinePanel}>
          <View style={styles.onlineHeader}>
            <View style={styles.onlineHeaderLeft}>
              <View style={[styles.colorBar, { backgroundColor: '#a855f7' }]} />
              <Text style={styles.modeName}>Online</Text>
            </View>
            <Pressable onPress={() => { setShowOnline(false); setShowJoin(false); setJoinCode(''); }} hitSlop={10}>
              <Text style={styles.closeText}>close</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.onlineBtn, pressed && styles.pressed]}
            onPress={goHost}
          >
            <Text style={styles.onlineBtnText}>Host — share a code</Text>
          </Pressable>

          {showJoin ? (
            <View style={styles.joinRow}>
              <TextInput
                autoFocus
                value={joinCode}
                onChangeText={(v) => setJoinCode(v.toUpperCase().slice(0, 4))}
                onSubmitEditing={goJoin}
                placeholder="CODE"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                style={styles.codeInput}
              />
              <Pressable
                onPress={goJoin}
                disabled={joinCode.trim().length !== 4}
                style={({ pressed }) => [
                  styles.joinGoBtn,
                  joinCode.trim().length !== 4 && styles.joinGoBtnDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.joinGoText}>Go</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.onlineDarkBtn, pressed && styles.pressed]}
              onPress={() => setShowJoin(true)}
            >
              <Text style={styles.onlineDarkBtnText}>Join with code</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.onlineSubtleBtn, pressed && styles.pressed]}
            onPress={goOnline}
          >
            <Text style={styles.onlineSubtleBtnText}>Random match</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d12' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  backArrow: { color: 'rgba(255,255,255,0.4)', fontSize: 22, lineHeight: 22 },
  backText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  quickStart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#dc2626',
  },
  quickStartIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartIconText: { color: '#fff', fontSize: 16 },
  quickStartTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
  quickStartSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
  },
  colorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  modeName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modeBrief: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  chevron: { color: 'rgba(255,255,255,0.2)', fontSize: 22, lineHeight: 22 },
  onlinePanel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  onlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  onlineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  onlineBtn: {
    marginHorizontal: 8,
    marginTop: 8,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#9333ea',
    alignItems: 'center',
  },
  onlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  onlineDarkBtn: {
    marginHorizontal: 8,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  onlineDarkBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  onlineSubtleBtn: {
    marginHorizontal: 8,
    marginBottom: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  onlineSubtleBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  joinRow: { flexDirection: 'row', gap: 8, marginHorizontal: 8 },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#fff',
    fontFamily: 'Menlo',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
  },
  joinGoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#9333ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinGoBtnDisabled: { opacity: 0.3 },
  joinGoText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.7 },
});
