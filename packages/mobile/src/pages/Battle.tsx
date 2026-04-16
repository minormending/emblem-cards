import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { FieldRow, FieldCol, SupportCard } from '@cards/shared';
import { getSlot, opposingPlayer } from '@cards/battle-engine';
import {
  useGameStore,
  getCurrentPlayer,
  getOpponentInfo,
  getIsMyTurn,
  getTurnNumber,
  getWinner,
} from '../store/gameStore';
import { HandView } from '../components/HandView';
import { CardInspector } from '../components/CardInspector';
import { BattleHints } from '../components/BattleHints';
import { MiniLog } from '../components/MiniLog';
import { EnergyBar } from '../components/battle/EnergyBar';
import { TurnBanner } from '../components/battle/TurnBanner';
import { MatchClock } from '../components/battle/MatchClock';
import { Toast } from '../components/battle/Toast';
import { FieldGrid } from '../components/battle/FieldGrid';
import { TurnTransitionOverlay } from '../components/battle/TurnTransitionOverlay';
import { ConnectionBanner } from '../components/battle/ConnectionBanner';
import { WinnerScreen } from '../components/battle/WinnerScreen';
import { useBattleSlotHandlers } from '../hooks/useBattleSlotHandlers';
import { useWinSound } from '../hooks/useWinSound';
import { useRecordOutcome } from '../hooks/useRecordOutcome';
import { sfx } from '../lib/sounds';

const SLOT_ASPECT = 112 / 92;
const LANDSCAPE_HAND_WIDTH = 180;

export function Battle() {
  const store = useGameStore();
  const {
    mode,
    selectedHandIndex,
    selectedAttackerPos,
    setSelectedHandIndex,
    message,
    exitGame,
    rematch,
  } = store;

  const me = getCurrentPlayer(store);
  const opponent = getOpponentInfo(store);
  const isMyTurn = getIsMyTurn(store);
  const turnNumber = getTurnNumber(store);
  const winner = getWinner(store);
  const { handleOwnSlotClick, handleEnemySlotClick } = useBattleSlotHandlers(
    me,
    isMyTurn,
  );
  const lastHitPos = store.lastHitPos;

  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const slotSize = computeSlotSize(width, height, landscape);

  const didWin =
    mode === 'ai' || mode === 'online' ? winner === me?.id : Boolean(winner);
  useWinSound(winner, didWin);
  useRecordOutcome(winner, didWin, mode, turnNumber);

  if (!me || !opponent) return null;

  if (winner) {
    const winnerName = winner === me.id ? me.name : opponent.name;
    return (
      <WinnerScreen
        didWin={didWin}
        winnerName={winnerName}
        turnCount={turnNumber}
        onBackToMenu={exitGame}
        onRematch={mode === 'online' ? undefined : rematch}
        mode={mode}
      />
    );
  }

  const doEndTurn = () => {
    console.log(
      '[Battle] End Turn tapped. isMyTurn=', isMyTurn,
      'mode=', mode,
      'currentPlayerIndex=',
      useGameStore.getState().gameState?.currentPlayerIndex,
    );
    useGameStore.getState().getActions().endTurn();
  };
  const ownFieldEmpty = isFieldEmpty(me.field);

  // Tap on the field background (not a slot) cancels any active selection.
  // Slot Pressables swallow their own taps, so only the gaps reach here.
  const cancelSelection = () => {
    if (selectedHandIndex !== null) setSelectedHandIndex(null);
    if (selectedAttackerPos !== null) store.setSelectedAttackerPos(null);
  };
  const hasSelection =
    selectedHandIndex !== null || selectedAttackerPos !== null;

  const oppGrid = (
    <FieldGrid
      field={opponent.field}
      isOwn={false}
      flipped
      selectedHandIndex={selectedHandIndex}
      selectedAttackerPos={selectedAttackerPos}
      lastHitPos={lastHitPos}
      ownField={me.field}
      ownSupports={me.activeSupportCards}
      opponentSupports={opponentSupports(store)}
      onSlotPress={handleEnemySlotClick}
      slotSize={slotSize}
    />
  );
  const ownGrid = (
    <FieldGrid
      field={me.field}
      isOwn
      flipped={false}
      selectedHandIndex={selectedHandIndex}
      selectedAttackerPos={selectedAttackerPos}
      lastHitPos={lastHitPos}
      ownField={me.field}
      ownSupports={me.activeSupportCards}
      opponentSupports={opponentSupports(store)}
      onSlotPress={handleOwnSlotClick}
      slotSize={slotSize}
    />
  );

  const topBar = (
    <View style={styles.topBar}>
      <View style={{ flexDirection: 'column' }}>
        <TurnBanner
          playerName={opponent.name}
          turnNumber={turnNumber}
          isMyTurn={isMyTurn}
        />
        <MatchClock />
      </View>
      <EnergyBar current={me.energy} max={me.maxEnergy} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pressable
          disabled={!isMyTurn}
          onPress={doEndTurn}
          style={[
            styles.endTurnBtn,
            !isMyTurn && { backgroundColor: '#374151' },
          ]}
        >
          <Text
            style={[styles.endTurnText, !isMyTurn && { color: '#6b7280' }]}
          >
            End Turn
          </Text>
        </Pressable>
        <Pressable onPress={exitGame} style={styles.quitBtn}>
          <Text style={styles.quitText}>Quit</Text>
        </Pressable>
      </View>
    </View>
  );

  const handNode = (vertical: boolean) => (
    <HandView
      hand={me.hand}
      selectedIndex={selectedHandIndex}
      onSelect={(i) => {
        if (!isMyTurn) return;
        sfx.select();
        setSelectedHandIndex(selectedHandIndex === i ? null : i);
      }}
      isActive={isMyTurn}
      energy={me.energy}
      vertical={vertical}
    />
  );

  const handHeader = (
    <View style={styles.handHeader}>
      <Text style={styles.handLabel}>Hand ({me.hand.length})</Text>
      {selectedHandIndex !== null && (
        <Pressable onPress={() => setSelectedHandIndex(null)}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <CardInspector />
      <BattleHints />

      {topBar}
      <ConnectionBanner />

      <Toast message={message} />
      <TurnTransitionOverlay
        turnNumber={turnNumber}
        currentPlayerName={me.name}
        enabled={mode === 'local'}
      />

      {landscape ? (
        <View style={styles.landscapeBody}>
          <Pressable
            style={styles.landscapeField}
            onPress={cancelSelection}
            disabled={!hasSelection}
          >
            <View style={styles.opponentInfo}>
              <Text style={styles.infoText}>{opponent.name}</Text>
              <Text style={styles.infoText}>Hand: {opponent.handCount}</Text>
              <Text style={styles.infoText}>Deck: {opponent.deckCount}</Text>
              <Text style={styles.infoText}>
                Discard: {opponent.discardCount}
              </Text>
            </View>
            {oppGrid}
            <View style={styles.divider} />
            {ownFieldEmpty && isMyTurn && (
              <Text style={styles.deployHint}>
                Select a card from your hand, then tap a slot
              </Text>
            )}
            {ownGrid}
            <View style={styles.ownInfo}>
              <Text style={styles.infoText}>Deck: {me.deck.length}</Text>
              <Text style={styles.infoText}>
                Discard: {me.discardPile.length}
              </Text>
            </View>
          </Pressable>
          <View style={styles.landscapeHand}>
            <MiniLog />
            {handHeader}
            {handNode(true)}
          </View>
        </View>
      ) : (
        <>
          <Pressable
            style={styles.fieldArea}
            onPress={cancelSelection}
            disabled={!hasSelection}
          >
            <View style={styles.opponentInfo}>
              <Text style={styles.infoText}>{opponent.name}</Text>
              <Text style={styles.infoText}>Hand: {opponent.handCount}</Text>
              <Text style={styles.infoText}>Deck: {opponent.deckCount}</Text>
              <Text style={styles.infoText}>
                Discard: {opponent.discardCount}
              </Text>
            </View>
            {oppGrid}
            <View style={styles.divider} />
            {ownFieldEmpty && isMyTurn && (
              <Text style={styles.deployHint}>
                Select a card from your hand, then tap a slot to deploy
              </Text>
            )}
            {ownGrid}
            <View style={styles.ownInfo}>
              <Text style={styles.infoText}>Deck: {me.deck.length}</Text>
              <Text style={styles.infoText}>
                Discard: {me.discardPile.length}
              </Text>
            </View>
          </Pressable>
          <MiniLog />
          <View style={styles.handPanel}>
            {handHeader}
            {handNode(false)}
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Fit the 2-field × 2-row × 3-col grid into the available space.
 * Landscape docks a ~180px hand column on the right so the field has
 * less width to work with but more height; portrait reserves a 140px
 * hand panel at the bottom.
 */
function computeSlotSize(
  width: number,
  height: number,
  landscape: boolean,
): { width: number; height: number } {
  // Reserves measured against the actual layout:
  //   status bar + top bar (paddingTop 36 + turn/clock block + padding ~= 100)
  //   two info rows (opponent + own), 16 each
  //   divider ~12, deploy hint 16, MiniLog 26
  //   plus 8px of field-area vertical padding on both ends
  const chromeH = 110;
  const infoRowsH = 40;
  const interFieldH = 16 + 16; // divider + deploy-hint buffer
  const miniLogH = 26;
  const handH = landscape ? 0 : 150;
  const verticalPaddingH = 24;

  const availH =
    height - chromeH - infoRowsH - interFieldH - miniLogH - handH - verticalPaddingH;
  const availW = landscape
    ? width - LANDSCAPE_HAND_WIDTH - 28
    : width - 28;

  // Width constraint: 3 slots + 2 gaps.
  const widthPer = (availW - 12) / 3;
  // Height constraint: 4 rows (2 fields × 2 rows) + 3 gaps.
  const heightPer = (availH - 18) / 4;
  // Pick the smaller dimension, then flow back to aspect-correct pair.
  const byWidth = widthPer;
  const byHeight = heightPer / SLOT_ASPECT;
  // Shrink ~10% so the grid visibly breathes away from the chrome + hand —
  // the computed max was technically fitting but felt cramped on real phones.
  const side = Math.max(64, Math.min(byWidth, byHeight) * 0.9);
  return { width: side, height: side * SLOT_ASPECT };
}

function isFieldEmpty(field: Parameters<typeof getSlot>[0]): boolean {
  const rows: FieldRow[] = ['front', 'back'];
  const cols: FieldCol[] = [0, 1, 2];
  return rows.every((row) =>
    cols.every((col) => getSlot(field, { row, col }).unit === null),
  );
}

function opponentSupports(
  store: ReturnType<typeof useGameStore.getState>,
): SupportCard[] {
  if ((store.mode === 'local' || store.mode === 'ai') && store.gameState) {
    const opp =
      store.mode === 'ai'
        ? store.gameState.players[1]
        : opposingPlayer(store.gameState);
    return opp.activeSupportCards;
  }
  return [];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d12', paddingTop: 36 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  endTurnBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
  },
  endTurnText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  quitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  quitText: { color: '#9ca3af', fontSize: 11 },
  fieldArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  landscapeBody: { flex: 1, flexDirection: 'row' },
  landscapeField: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  landscapeHand: {
    width: LANDSCAPE_HAND_WIDTH,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderLeftWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
  },
  opponentInfo: { flexDirection: 'row', gap: 12, opacity: 0.5 },
  ownInfo: {
    flexDirection: 'row',
    gap: 12,
    opacity: 0.6,
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: { color: '#fff', fontSize: 10 },
  divider: {
    width: 280,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  deployHint: { color: 'rgba(110,231,183,0.6)', fontSize: 11 },
  handPanel: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  handHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  handLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  cancel: { color: '#9ca3af', fontSize: 11 },
});
