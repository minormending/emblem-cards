import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import type { Card } from '@cards/shared';
import { DECK_SIZE, MAX_CARD_COPIES, cloneCard } from '@cards/shared';
import { units, weapons, items, supports, tactics, buildRandomDeck } from '@cards/card-engine';
import { CardView } from '../components/CardView';
import { CardInspector } from '../components/CardInspector';
import { useGameStore } from '../store/gameStore';

const tabs = [
  { label: 'Units', cards: units as Card[] },
  { label: 'Weapons', cards: weapons as Card[] },
  { label: 'Items', cards: items as Card[] },
  { label: 'Supports', cards: supports as Card[] },
  { label: 'Tactics', cards: tactics as Card[] },
];

/**
 * Lightweight free-text match across the fields a player most likely wants
 * to filter by. Tokenized AND — "mage fire" keeps cards that mention both.
 */
/**
 * Apply the full set of DeckBuilder filters: text search, cost bucket, sort.
 * Cost bucket 6 is a ≥6 catch-all so high-cost spike cards aren't hidden.
 */
function filterAndSort(
  cards: Card[],
  query: string,
  costs: Set<number>,
  sortBy: 'cost' | 'name',
): Card[] {
  const filtered = cards.filter((c) => {
    if (!cardMatchesQuery(c, query)) return false;
    if (costs.size === 0) return true;
    const bucket = c.cost >= 6 ? 6 : c.cost;
    return costs.has(bucket);
  });
  const sorted = [...filtered];
  if (sortBy === 'cost') {
    sorted.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

function cardMatchesQuery(card: Card, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const haystack: string[] = [card.name.toLowerCase(), card.type];
  if (card.type === 'unit') {
    haystack.push(card.class.toLowerCase());
    haystack.push(card.attackType);
    haystack.push(...card.tags.map((t) => t.toLowerCase()));
    if (card.isLord) haystack.push('lord');
  }
  if (card.type === 'weapon') {
    haystack.push(card.attackType);
  }
  const blob = haystack.join(' ');
  return q.split(/\s+/).every((token) => blob.includes(token));
}

function DeckPanel({
  label,
  deck,
  onRemove,
  isActive,
}: {
  label: string;
  deck: Card[];
  onRemove: (index: number) => void;
  isActive: boolean;
}) {
  const lordCount = deck.filter((c) => c.type === 'unit' && c.isLord).length;
  const isFull = deck.length === DECK_SIZE;
  return (
    <View
      style={[
        styles.panel,
        { borderColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)' },
      ]}
    >
      <View style={styles.rowBetween}>
        <Text style={styles.panelLabel}>{label}</Text>
        <Text
          style={[
            styles.panelCount,
            { color: isFull ? '#34d399' : 'rgba(255,255,255,0.3)' },
          ]}
        >
          {deck.length}/{DECK_SIZE}
        </Text>
      </View>

      {deck.length > 0 && (
        <View style={{ gap: 2, marginBottom: 6 }}>
          <Text
            style={{
              color: lordCount > 0 ? '#34d399' : '#f87171',
              fontSize: 11,
            }}
          >
            {lordCount > 0 ? '+ Lord selected' : '- Add a Lord unit'}
          </Text>
          <Text
            style={{
              color: isFull ? '#34d399' : 'rgba(255,255,255,0.4)',
              fontSize: 11,
            }}
          >
            {isFull ? '+ Deck complete' : `- ${DECK_SIZE - deck.length} more needed`}
          </Text>
        </View>
      )}

      <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
        {deck.map((card, i) => (
          <View key={`${card.id}-${i}`} style={styles.deckRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {card.type === 'unit' && card.isLord && (
                <Text style={{ color: '#fcd34d', fontSize: 10 }}>* </Text>
              )}
              <Text
                style={[
                  { color: '#fff', fontSize: 12 },
                  card.type === 'unit' && card.isLord && { color: '#fcd34d', fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {card.name}
              </Text>
              <Text style={styles.typeLabel}> {card.type}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.costPill}>
                <Text style={styles.costPillText}>{card.cost}</Text>
              </View>
              {isActive && (
                <Pressable onPress={() => onRemove(i)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>x</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function DeckBuilder() {
  const {
    p1Deck,
    p2Deck,
    setP1Deck,
    setP2Deck,
    startLocalBattle,
    joinQueue,
    createRoom,
    joinRoom,
    mode,
    roomRole,
    roomCode,
    setScreen,
  } = useGameStore();
  const singleDeck = mode === 'online' || mode === 'ai';
  const [activeTab, setActiveTab] = useState(0);
  const [buildingFor, setBuildingFor] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  // Selected cost buckets. Index 5 is the "6+" catch-all. Empty set = show all.
  const [costFilters, setCostFilters] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'cost' | 'name'>('cost');

  const toggleCost = (bucket: number) => {
    setCostFilters((prev) => {
      const next = new Set(prev);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  const currentDeck = buildingFor === 1 ? p1Deck : p2Deck;
  const setCurrentDeck = buildingFor === 1 ? setP1Deck : setP2Deck;

  function addCard(card: Card) {
    if (currentDeck.length >= DECK_SIZE) return;
    const copies = currentDeck.filter((c) => c.id === card.id).length;
    if (copies >= MAX_CARD_COPIES) return;
    if (card.type === 'unit' && card.isLord) {
      if (currentDeck.some((c) => c.type === 'unit' && c.isLord)) return;
    }
    setCurrentDeck([...currentDeck, cloneCard(card)]);
  }

  function removeCard(index: number) {
    const next = [...currentDeck];
    next.splice(index, 1);
    setCurrentDeck(next);
  }

  function handleGo() {
    if (mode === 'online') {
      if (roomRole === 'host') {
        createRoom();
      } else if (roomRole === 'guest' && roomCode) {
        joinRoom(roomCode);
      } else {
        joinQueue();
      }
    } else if (mode === 'ai') {
      setP2Deck(buildRandomDeck());
      useGameStore.getState().startLocalBattle();
    } else {
      startLocalBattle();
    }
  }

  const p1Ready =
    p1Deck.length === DECK_SIZE && p1Deck.some((c) => c.type === 'unit' && c.isLord);
  const p2Ready =
    p2Deck.length === DECK_SIZE && p2Deck.some((c) => c.type === 'unit' && c.isLord);
  const canBattle = singleDeck ? p1Ready : p1Ready && p2Ready;

  return (
    <View style={styles.container}>
      <CardInspector />

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => setScreen('menu')}>
            <Text style={styles.backBtn}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Deck Builder</Text>
          {mode === 'online' && (
            <Badge
              label={
                roomRole === 'host'
                  ? 'Play with Friend'
                  : roomRole === 'guest'
                    ? `Join ${roomCode ?? ''}`
                    : 'Online'
              }
              color="#a855f7"
            />
          )}
          {mode === 'ai' && <Badge label="VS CPU" color="#3b82f6" />}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={() => setCurrentDeck([])}
            style={styles.smallBtn}
          >
            <Text style={styles.smallBtnText}>Clear</Text>
          </Pressable>
          <Pressable
            onPress={() => setCurrentDeck(buildRandomDeck())}
            style={styles.smallBtn}
          >
            <Text style={styles.smallBtnText}>Auto</Text>
          </Pressable>
          <Pressable
            disabled={!canBattle}
            onPress={handleGo}
            style={[
              styles.battleBtn,
              {
                backgroundColor: canBattle
                  ? mode === 'online'
                    ? '#7c3aed'
                    : '#dc2626'
                  : '#374151',
              },
            ]}
          >
            <Text style={styles.battleBtnText}>
              {mode === 'online'
                ? roomRole === 'host'
                  ? 'Create Room'
                  : roomRole === 'guest'
                    ? 'Join Game'
                    : 'Find Match'
                : 'Battle'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {!singleDeck && (
            <View style={styles.playerToggle}>
              <Pressable
                onPress={() => setBuildingFor(1)}
                style={[
                  styles.toggleBtn,
                  buildingFor === 1 && { backgroundColor: '#2563eb' },
                ]}
              >
                <Text style={styles.toggleText}>P1</Text>
              </Pressable>
              <Pressable
                onPress={() => setBuildingFor(2)}
                style={[
                  styles.toggleBtn,
                  buildingFor === 2 && { backgroundColor: '#dc2626' },
                ]}
              >
                <Text style={styles.toggleText}>P2</Text>
              </Pressable>
            </View>
          )}
          {tabs.map((tab, i) => (
            <Pressable
              key={tab.label}
              onPress={() => setActiveTab(i)}
              style={[
                styles.tab,
                i === activeTab && { backgroundColor: 'rgba(255,255,255,0.1)' },
              ]}
            >
              <Text style={styles.tabText}>
                {tab.label} <Text style={{ opacity: 0.5 }}>({tab.cards.length})</Text>
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, class, tag, element..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={styles.searchClear}>clear</Text>
            </Pressable>
          )}
        </View>

        {/* Cost filter + sort */}
        <View style={styles.filterRow}>
          {[1, 2, 3, 4, 5, 6].map((c) => {
            const active = costFilters.has(c);
            const label = c === 6 ? '6+' : String(c);
            return (
              <Pressable
                key={c}
                onPress={() => toggleCost(c)}
                style={[styles.costPillBtn, active && styles.costPillBtnActive]}
              >
                <Text
                  style={[
                    styles.costPillBtnText,
                    active && styles.costPillBtnTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          {(costFilters.size > 0 || query.length > 0) && (
            <Pressable
              onPress={() => {
                setCostFilters(new Set());
                setQuery('');
              }}
              style={styles.resetBtn}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setSortBy(sortBy === 'cost' ? 'name' : 'cost')}
            style={styles.sortBtn}
          >
            <Text style={styles.sortBtnText}>Sort: {sortBy}</Text>
          </Pressable>
        </View>

        {/* Card grid */}
        {(() => {
          const visible = filterAndSort(
            tabs[activeTab].cards,
            query,
            costFilters,
            sortBy,
          );
          if (visible.length === 0) {
            return (
              <Text style={styles.noMatches}>
                No {tabs[activeTab].label.toLowerCase()} match the current filters
              </Text>
            );
          }
          return null;
        })()}
        <View style={styles.grid}>
          {filterAndSort(tabs[activeTab].cards, query, costFilters, sortBy).map(
            (card) => {
            const copies = currentDeck.filter((c) => c.id === card.id).length;
            const maxed =
              copies >= MAX_CARD_COPIES ||
              (card.type === 'unit' && card.isLord && copies >= 1);
            const deckFull = currentDeck.length >= DECK_SIZE;
            return (
              <View key={card.id} style={{ position: 'relative', margin: 4 }}>
                <CardView
                  card={card}
                  onPress={() => addCard(card)}
                  disabled={maxed || deckFull}
                />
                {copies > 0 && (
                  <View style={styles.copyBadge}>
                    <Text style={styles.copyBadgeText}>{copies}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Deck panels */}
        <View style={{ padding: 12, gap: 12 }}>
          <DeckPanel
            label={singleDeck ? 'Your Deck' : 'Player 1'}
            deck={p1Deck}
            onRemove={removeCard}
            isActive={buildingFor === 1}
          />
          {!singleDeck && (
            <DeckPanel
              label="Player 2"
              deck={p2Deck}
              onRemove={removeCard}
              isActive={buildingFor === 2}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: `${color}33`,
        borderColor: color,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
      }}
    >
      <Text style={{ color, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d12', paddingTop: 44 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  backBtn: { color: '#9ca3af', fontSize: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
    borderRadius: 6,
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  smallBtnText: { color: '#d1d5db', fontSize: 12 },
  battleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  battleBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
  },
  playerToggle: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    padding: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabText: { color: '#d1d5db', fontSize: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  searchClear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  noMatches: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  costPillBtn: {
    width: 32,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  costPillBtnActive: {
    backgroundColor: 'rgba(245,158,11,0.25)',
    borderColor: '#f59e0b',
  },
  costPillBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  costPillBtnTextActive: { color: '#fbbf24' },
  sortBtn: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sortBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  resetBtn: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  resetBtnText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
  },
  copyBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  panel: {
    backgroundColor: 'rgba(17,24,39,0.8)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  panelCount: { fontSize: 12, fontWeight: '700' },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    marginBottom: 2,
  },
  typeLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  costPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  costPillText: { color: '#fbbf24', fontSize: 10, fontWeight: '700' },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#f87171', fontSize: 10 },
});
