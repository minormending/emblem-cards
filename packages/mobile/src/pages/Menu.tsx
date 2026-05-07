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
  const { setScreen, resumeSession, discardSession } = useGameStore();
  const [savedMode, setSavedMode] = useState<'ai' | 'local' | null>(null);
  const [savedTurn, setSavedTurn] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const stats = getStats();
  const totalGames =
    stats.ai.wins + stats.ai.losses +
    stats.local.wins + stats.local.losses +
    stats.online.wins + stats.online.losses;
  const totalWins = stats.ai.wins + stats.local.wins + stats.online.wins;
  const totalLosses = stats.ai.losses + stats.local.losses + stats.online.losses;

  const [name, setName] = useState(getDisplayName());
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  useEffect(() => {
    if (!hasSeenTutorial()) setShowTutorial(true);
  }, []);

  const closeTutorial = () => {
    markTutorialSeen();
    setShowTutorial(false);
  };

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

  function commitName() {
    const clean = draftName.trim().slice(0, 20);
    if (clean) {
      setDisplayName(clean);
      setName(clean);
    }
    setEditingName(false);
  }

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

      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Emblem Cards</Text>
        <Text style={styles.subtitle}>
          Tactical card battles on a 2×3 grid
        </Text>
      </View>

      {/* Identity card */}
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>

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
            style={styles.nameArea}
          >
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.editHint}>tap to edit</Text>
          </Pressable>
        )}

        {totalGames > 0 ? (
          <View style={styles.statsRow}>
            <Text style={styles.statWins}>{totalWins}W</Text>
            <Text style={styles.statDash}>{'\u2013'}</Text>
            <Text style={styles.statLosses}>{totalLosses}L</Text>
          </View>
        ) : (
          <Text style={styles.idText}>{playerId.slice(0, 8)}</Text>
        )}
      </View>

      {/* Resume match banner */}
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

      {/* Play button */}
      <Pressable
        style={({ pressed }) => [
          styles.playBtn,
          pressed && styles.playBtnPressed,
        ]}
        onPress={() => {
          sfx.select();
          setScreen('mode-select');
        }}
      >
        <Text style={styles.playBtnText}>Play</Text>
      </Pressable>

      {/* Bottom links */}
      <View style={styles.bottomRow}>
        <Pressable
          onPress={() => {
            resetTutorial();
            setShowTutorial(true);
          }}
        >
          <Text style={styles.linkText}>How to Play</Text>
        </Pressable>
        <Pressable onPress={() => setShowSettings(true)}>
          <Text style={styles.linkText}>Settings</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        No accounts. No passwords. Your identity lives only on this device.
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
    gap: 20,
  },
  header: { alignItems: 'center', marginBottom: 4 },
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
    width: 280,
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0b0d12', fontWeight: '900', fontSize: 26 },
  nameInput: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: 'center',
    width: '100%',
  },
  nameArea: { alignItems: 'center' },
  nameText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  editHint: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statWins: { color: '#34d399', fontWeight: '700', fontSize: 14 },
  statDash: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },
  statLosses: { color: '#f87171', fontWeight: '700', fontSize: 14 },
  idText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  resumeCard: {
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.4)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  resumeTitle: { color: '#fcd34d', fontSize: 13, fontWeight: '700' },
  resumeSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  resumeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
  },
  resumeBtnText: { color: '#0b0d12', fontWeight: '800', fontSize: 12 },
  resumeDiscard: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  playBtn: {
    width: 280,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  playBtnText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  linkText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  footer: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 280,
  },
});
