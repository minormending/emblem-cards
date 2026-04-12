import type { FieldRow, FieldCol } from "@cards/shared";
import { getSlot } from "@cards/battle-engine";
import {
  useGameStore,
  getCurrentPlayer,
  getOpponentInfo,
  getIsMyTurn,
  getTurnNumber,
  getWinner,
} from "../store/gameStore";
import { HandView } from "../components/HandView";
import { GameLog } from "../components/GameLog";
import { CardInspector } from "../components/CardInspector";
import { BattleHints } from "../components/BattleHints";
import { EnergyBar } from "../components/battle/EnergyBar";
import { TurnBanner } from "../components/battle/TurnBanner";
import { ActionHint } from "../components/battle/ActionHint";
import { Toast } from "../components/battle/Toast";
import { FieldGrid } from "../components/battle/FieldGrid";
import { WinnerScreen } from "../components/battle/WinnerScreen";
import { TurnTransitionOverlay } from "../components/battle/TurnTransitionOverlay";
import { useBattleSlotHandlers } from "../hooks/useBattleSlotHandlers";
import { useWinSound } from "../hooks/useWinSound";
import { sfx } from "../lib/sounds";

/**
 * Battle screen — the main gameplay view.
 *
 * Layout (top to bottom):
 *   1. Top bar: turn banner + energy + End Turn/Quit
 *   2. Action hint (context-sensitive instructions)
 *   3. Toast (fire-and-forget messages)
 *   4. Turn transition overlay (hot-seat only)
 *   5. Field area: opponent field + divider + own field, with log sidebar
 *   6. Hand
 *
 * All real logic lives in hooks and child components — this file is mostly
 * layout + dispatching state to the pieces that care about it.
 */
export function Battle() {
  const store = useGameStore();
  const {
    mode,
    selectedHandIndex,
    selectedAttackerPos,
    setSelectedHandIndex,
    message,
    exitGame,
  } = store;

  const me = getCurrentPlayer(store);
  const opponent = getOpponentInfo(store);
  const isMyTurn = getIsMyTurn(store);
  const turnNumber = getTurnNumber(store);
  const winner = getWinner(store);

  const { handleOwnSlotClick, handleEnemySlotClick } = useBattleSlotHandlers(me, isMyTurn);
  const lastHitPos = store.lastHitPos;

  const didWin = mode === "ai" || mode === "online" ? winner === me?.id : Boolean(winner);
  useWinSound(winner, didWin);

  if (!me || !opponent) return null;

  if (winner) {
    return (
      <WinnerScreen
        didWin={didWin}
        winnerName={winner}
        turnCount={turnNumber}
        onBackToMenu={exitGame}
      />
    );
  }

  const doEndTurn = () => store.getActions().endTurn();
  const ownFieldEmpty = isFieldEmpty(me.field);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 to-gray-900">
      <CardInspector />
      <BattleHints />

      <TopBar
        opponentName={opponent.name}
        turnNumber={turnNumber}
        isMyTurn={isMyTurn}
        energy={me.energy}
        maxEnergy={me.maxEnergy}
        onEndTurn={doEndTurn}
        onQuit={exitGame}
      />

      <ActionHint
        selectedHandIndex={selectedHandIndex}
        selectedAttackerPos={selectedAttackerPos}
        isMyTurn={isMyTurn}
      />

      <Toast message={message} />
      <TurnTransitionOverlay
        turnNumber={turnNumber}
        currentPlayerName={me.name}
        enabled={mode === "local"}
      />

      <div className="flex-1 flex relative">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
          <OpponentInfo opponent={opponent} />
          <FieldGrid
            field={opponent.field}
            isOwn={false}
            flipped={true}
            selectedHandIndex={selectedHandIndex}
            selectedAttackerPos={selectedAttackerPos}
            lastHitPos={lastHitPos}
            onClick={handleEnemySlotClick}
          />
          <FieldDivider />
          {ownFieldEmpty && isMyTurn && (
            <div className="text-xs text-emerald-300/60 animate-pulse mb-1">
              Select a card from your hand, then click a slot to deploy
            </div>
          )}
          <FieldGrid
            field={me.field}
            isOwn={true}
            flipped={false}
            selectedHandIndex={selectedHandIndex}
            selectedAttackerPos={selectedAttackerPos}
            lastHitPos={lastHitPos}
            onClick={handleOwnSlotClick}
          />
          <OwnInfo deckCount={me.deck.length} discardCount={me.discardPile.length} />
        </div>

        <aside className="w-56 border-l border-white/5 bg-black/30 shrink-0 hidden lg:flex flex-col">
          <GameLog />
        </aside>
      </div>

      <HandPanel
        hand={me.hand}
        selectedIndex={selectedHandIndex}
        isMyTurn={isMyTurn}
        energy={me.energy}
        onSelect={(i) => {
          if (!isMyTurn) return;
          sfx.select();
          setSelectedHandIndex(selectedHandIndex === i ? null : i);
        }}
        onCancelSelection={() => setSelectedHandIndex(null)}
      />
    </div>
  );
}

// ── Small presentational sub-components (kept local to Battle.tsx) ──

function TopBar(props: {
  opponentName: string;
  turnNumber: number;
  isMyTurn: boolean;
  energy: number;
  maxEnergy: number;
  onEndTurn: () => void;
  onQuit: () => void;
}) {
  const endTurnClass = props.isMyTurn
    ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-900 shadow-lg shadow-amber-500/20"
    : "bg-gray-800 text-gray-600 cursor-not-allowed";

  return (
    <div className="flex justify-between items-center px-5 py-3 bg-black/40 border-b border-white/5">
      <TurnBanner
        playerName={props.opponentName}
        turnNumber={props.turnNumber}
        isMyTurn={props.isMyTurn}
      />
      <EnergyBar current={props.energy} max={props.maxEnergy} />
      <div className="flex gap-2">
        <button
          onClick={props.isMyTurn ? props.onEndTurn : undefined}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${endTurnClass}`}
        >
          End Turn
        </button>
        <button
          onClick={props.onQuit}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors"
        >
          Quit
        </button>
      </div>
    </div>
  );
}

function OpponentInfo({
  opponent,
}: {
  opponent: {
    name: string;
    handCount: number;
    deckCount: number;
    discardCount: number;
  };
}) {
  return (
    <div className="flex items-center gap-4 text-xs opacity-50 mb-1">
      <span>{opponent.name}</span>
      <span>Hand: {opponent.handCount}</span>
      <span>Deck: {opponent.deckCount}</span>
      <span>Discard: {opponent.discardCount}</span>
    </div>
  );
}

function OwnInfo({ deckCount, discardCount }: { deckCount: number; discardCount: number }) {
  return (
    <div className="flex items-center gap-4 text-xs opacity-50 mt-1">
      <span>Deck: {deckCount}</span>
      <span>Discard: {discardCount}</span>
    </div>
  );
}

function FieldDivider() {
  return (
    <div className="w-96 flex items-center gap-2 my-1">
      <div className="flex-1 border-t border-white/10" />
      <span className="text-[10px] opacity-20 uppercase tracking-widest">vs</span>
      <div className="flex-1 border-t border-white/10" />
    </div>
  );
}

function HandPanel(props: {
  hand: Parameters<typeof HandView>[0]["hand"];
  selectedIndex: number | null;
  isMyTurn: boolean;
  energy: number;
  onSelect: (i: number) => void;
  onCancelSelection: () => void;
}) {
  return (
    <div className="bg-black/50 border-t border-white/10 px-4 pb-3 pt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-white/40">Hand ({props.hand.length})</span>
        {props.selectedIndex !== null && (
          <button
            onClick={props.onCancelSelection}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      <HandView
        hand={props.hand}
        selectedIndex={props.selectedIndex}
        onSelect={props.onSelect}
        isActive={props.isMyTurn}
        energy={props.energy}
      />
    </div>
  );
}

// ── Utility ──

function isFieldEmpty(field: Parameters<typeof getSlot>[0]): boolean {
  const rows: FieldRow[] = ["front", "back"];
  const cols: FieldCol[] = [0, 1, 2];
  return rows.every((row) => cols.every((col) => getSlot(field, { row, col }).unit === null));
}
