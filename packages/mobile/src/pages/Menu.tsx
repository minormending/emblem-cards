import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { getDisplayName, setDisplayName, getPlayerId } from '../lib/identity';
import {
  hasSeenTutorial,
  markTutorialSeen,
  resetTutorial,
} from '../lib/firstTime';
import { HowToPlay } from '../components/HowToPlay';
import { Settings } from '../components/Settings';
import { loadSession } from '../lib/session';
import { sfx } from '../lib/sounds';
import { getStats } from '../lib/stats';

export function Menu() {
  const { setMode, setScreen, quickStart, resumeSession, discardSession } =
    useGameStore();
  const [savedMode, setSavedMode] = useState<'ai' | 'local' | null>(null);
  const [savedTurn, setSavedTurn] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const stats = getStats();
  const totalWins = stats.ai.wins + stats.local.wins + stats.online.wins;
  const totalLosses = stats.ai.losses + stats.local.losses + stats.online.losses;

  useEffect(() => {
    loadSession().then((snap) => {
      if (!snap) {
        setSavedMode(null);
        setSavedTurn(null);
        setSavedAt(null);
        return;
      }
      setSavedMode(snap.mode);
      setSavedTurn(snap.gameState.turnNumber);
      setSavedAt(snap.savedAt);
    });
  }, []);

  const handleContinue = async () => {
    const ok = await resumeSession();
    if (!ok) {
      setSavedMode(null);
      setSavedTurn(null);
    }
  };
  const handleDiscard = async () => {
    await discardSession();
    setSavedMode(null);
    setSavedTurn(null);
    setSavedAt(null);
  };

  const relativeSaved = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };
  const [name, setName] = useState(getDisplayName());
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!hasSeenTutorial()) setShowTutorial(true);
  }, []);

  const closeTutorial = () => {
    markTutorialSeen();
    setShowTutorial(false);
  };
  const replayTutorial = () => {
    resetTutorial();
    setShowTutorial(true);
  };

  function commitName() {
    const clean = draftName.trim().slice(0, 20);
    if (clean) {
      setDisplayName(clean);
      setName(clean);
    }
    setEditingName(false);
  }

  // Light haptic on nav so taps feel responsive; sfx.select respects the
  // Settings toggle so muting haptics disables these too.
  const nav = (fn: () => void) => () => {
    sfx.select();
    fn();
  };
  const goLocal = nav(() => {
    setMode('local');
    setScreen('deck-builder');
  });
  const goOnline = nav(() => {
    setMode('online');
    setScreen('deck-builder');
  });
  const goAI = nav(() => {
    setMode('ai');
    setScreen('deck-builder');
  });
  const handleQuickStart = nav(quickStart);

  const playerId = getPlayerId();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {showTutorial && <HowToPlay onClose={closeTutorial} />}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onIdentityChanged={() => setName(getDisplayName())}
        />
      )}

      {savedMode && (
        <View style={styles.resumeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeTitle}>Unfinished match</Text>
            <Text style={styles.resumeSub}>
              {savedMode === 'ai' ? 'vs AI' : 'Local 2P'} · turn {savedTurn}
              {savedAt ? ` · ${relativeSaved(savedAt)}` : ''}
            </Text>
          </View>
          <Pressable style={styles.resumeBtn} onPress={handleContinue}>
            <Text style={styles.resumeBtnText}>Continue</Text>
          </Pressable>
          <Pressable onPress={handleDiscard} hitSlop={10}>
            <Text style={styles.resumeDiscard}>Discard</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Emblem Cards</Text>
        <Text style={styles.subtitle}>
          Tactical card battles on a 2×3 grid
        </Text>
      </View>

      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          {editingName ? (
            <TextInput
              autoFocus
              value={draftName}
              onChangeText={setDraftName}
              onBlur={commitName}
              onSubmitEditing={commitName}
              maxLength={20}
              style={styles.nameInput}
              placeholderTextColor="#6b7280"
            />
          ) : (
            <Pressable
              onPress={() => {
                setDraftName(name);
                setEditingName(true);
              }}
            >
              <Text style={styles.nameText}>{name}</Text>
              <Text style={styles.idText}>
                {totalWins + totalLosses > 0
                  ? `${totalWins}W – ${totalLosses}L`
                  : `${playerId.slice(0, 8)}...`}
              </Text>
            </Pressable>
          )}
        </View>
        {!editingName && (
          <Pressable
            onPress={() => {
              setDraftName(name);
              setEditingName(true);
            }}
          >
            <Text style={styles.editLink}>edit</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={handleQuickStart}
        >
          <Text style={styles.primaryBtnText}>Quick Start</Text>
        </Pressable>
        <Text style={styles.hint}>Random decks vs AI, straight to battle</Text>

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.blueBtn, pressed && styles.pressed]}
          onPress={goAI}
        >
          <Text style={styles.blueBtnText}>VS Computer</Text>
        </Pressable>
        <Text style={styles.hint}>Build your deck, fight the AI</Text>

        <Pressable
          style={({ pressed }) => [styles.grayBtn, pressed && styles.pressed]}
          onPress={goLocal}
        >
          <Text style={styles.grayBtnText}>Local 2P</Text>
        </Pressable>
        <Text style={styles.hint}>Two players, one screen</Text>

        <Pressable
          style={({ pressed }) => [styles.grayBtn, pressed && styles.pressed]}
          onPress={goOnline}
        >
          <Text style={styles.grayBtnText}>Online</Text>
        </Pressable>
        <Text style={styles.hint}>Build a deck, find an opponent</Text>

        <View style={styles.divider} />

        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={replayTutorial}
          >
            <Text style={styles.secondaryText}>How to Play</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.secondaryText}>Settings</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.footer}>
        No accounts. No passwords. Your identity lives only in this device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d12' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 24,
  },
  header: { alignItems: 'center', marginBottom: 8 },
  title: {
    color: '#fbbf24',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  identityCard: {
    width: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0b0d12', fontWeight: '900', fontSize: 18 },
  nameInput: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nameText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  idText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'Menlo',
  },
  editLink: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  buttons: { width: 260, gap: 8 },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  blueBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  blueBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  grayBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  grayBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8,
  },
  hint: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: -4,
  },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  secondaryText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  resumeCard: {
    width: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  resumeTitle: { color: '#fcd34d', fontSize: 13, fontWeight: '700' },
  resumeSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  resumeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
  },
  resumeBtnText: { color: '#0b0d12', fontWeight: '800', fontSize: 12 },
  resumeDiscard: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  footer: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 280,
  },
});
