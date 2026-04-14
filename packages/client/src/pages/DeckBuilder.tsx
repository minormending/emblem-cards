import { useState } from "react";
import type { Card } from "@cards/shared";
import { DECK_SIZE, MAX_CARD_COPIES, cloneCard } from "@cards/shared";
import { units, weapons, items, supports, tactics } from "@cards/card-engine";
import { CardView } from "../components/CardView";
import { CardInspector } from "../components/CardInspector";
import { useGameStore } from "../store/gameStore";
import { buildRandomDeck } from "../lib/deckBuilder";
const tabs = [
  { label: "Units", cards: units as Card[] },
  { label: "Weapons", cards: weapons as Card[] },
  { label: "Items", cards: items as Card[] },
  { label: "Supports", cards: supports as Card[] },
  { label: "Tactics", cards: tactics as Card[] },
];

function DeckStats({ deck }: { deck: Card[] }) {
  if (deck.length === 0) return null;

  const unitCount = deck.filter((c) => c.type === "unit").length;
  const weaponCount = deck.filter((c) => c.type === "weapon").length;
  const otherCount = deck.length - unitCount - weaponCount;
  const avgCost = (deck.reduce((s, c) => s + c.cost, 0) / deck.length).toFixed(1);

  // Cost curve: 1 bucket per cost, 1–5 and a "6+" bucket
  const costBuckets = [0, 0, 0, 0, 0, 0];
  for (const c of deck) {
    const idx = Math.min(c.cost - 1, 5);
    costBuckets[idx]++;
  }
  const bucketLabels = ["1", "2", "3", "4", "5", "6+"];
  const maxBucket = Math.max(...costBuckets, 1);

  return (
    <div className="bg-white/5 rounded-lg p-2 mt-2">
      <div className="flex justify-between text-[10px] opacity-50 mb-1">
        <span>{unitCount} units / {weaponCount} weapons / {otherCount} other</span>
        <span>avg cost {avgCost}</span>
      </div>
      <div className="flex items-end gap-0.5 h-6">
        {costBuckets.map((count, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500/40 rounded-t transition-all"
              style={{ height: `${(count / maxBucket) * 24}px` }}
            />
            <span className="text-[8px] opacity-30 mt-0.5">{bucketLabels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const lordCount = deck.filter((c) => c.type === "unit" && c.isLord).length;
  const isFull = deck.length === DECK_SIZE;

  return (
    <div className={`bg-gray-900/80 rounded-xl p-3 w-64 border transition-colors ${
      isActive ? "border-white/20" : "border-white/5"
    }`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">{label}</h3>
        <span className={`text-xs font-bold ${
          isFull ? "text-emerald-400" : "text-white/30"
        }`}>
          {deck.length}/{DECK_SIZE}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isFull ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${(deck.length / DECK_SIZE) * 100}%` }}
        />
      </div>

      {/* Validation checklist */}
      <div className="space-y-1 mb-2">
        {deck.length > 0 && (
          <>
            <div className={`text-[11px] flex items-center gap-1.5 ${lordCount > 0 ? "text-emerald-400" : "text-red-400"}`}>
              <span>{lordCount > 0 ? "+" : "-"}</span>
              <span>{lordCount > 0 ? "Lord selected" : "Add a Lord unit"}</span>
            </div>
            <div className={`text-[11px] flex items-center gap-1.5 ${isFull ? "text-emerald-400" : "text-white/40"}`}>
              <span>{isFull ? "+" : "-"}</span>
              <span>{isFull ? "Deck complete" : `${DECK_SIZE - deck.length} more cards needed`}</span>
            </div>
          </>
        )}
        {isFull && lordCount > 0 && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 mt-1">
            Ready to battle
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
        {deck.map((card, i) => (
          <div
            key={`${card.id}-${i}`}
            className={`
              group flex justify-between items-center text-xs rounded px-2 py-1 transition-colors
              ${isActive
                ? "bg-white/5 hover:bg-red-500/10 cursor-pointer"
                : "bg-white/3 opacity-50"
              }
            `}
          >
            <div className="flex items-center gap-1.5 truncate">
              {card.type === "unit" && card.isLord && (
                <span className="text-mythic text-[10px]">*</span>
              )}
              <span className={card.type === "unit" && card.isLord ? "text-mythic font-bold" : ""}>
                {card.name}
              </span>
              <span className="text-[10px] opacity-30">{card.type}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                {card.cost}
              </span>
              {isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                  className="w-4 h-4 rounded-full text-[10px] text-gray-500 hover:text-red-400 hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <DeckStats deck={deck} />
    </div>
  );
}

export function DeckBuilder() {
  const { p1Deck, p2Deck, setP1Deck, setP2Deck, startLocalBattle, joinQueue, createRoom, joinRoom, mode, roomRole, roomCode, setScreen } = useGameStore();
  const singleDeck = mode === "online" || mode === "ai";
  const [activeTab, setActiveTab] = useState(0);
  const [buildingFor, setBuildingFor] = useState<1 | 2>(1);

  const currentDeck = buildingFor === 1 ? p1Deck : p2Deck;
  const setCurrentDeck = buildingFor === 1 ? setP1Deck : setP2Deck;

  function addCard(card: Card) {
    if (currentDeck.length >= DECK_SIZE) return;
    const copies = currentDeck.filter((c) => c.id === card.id).length;
    if (copies >= MAX_CARD_COPIES) return;
    if (card.type === "unit" && card.isLord) {
      const hasLord = currentDeck.some((c) => c.type === "unit" && c.isLord);
      if (hasLord) return;
    }
    // Clone so each deck slot is an independent instance — two copies of the
    // same card must never share mutable state.
    setCurrentDeck([...currentDeck, cloneCard(card)]);
  }

  function removeCard(index: number) {
    const next = [...currentDeck];
    next.splice(index, 1);
    setCurrentDeck(next);
  }

  function autoFill() {
    setCurrentDeck(buildRandomDeck());
  }

  function clearDeck() {
    setCurrentDeck([]);
  }

  const [goingToBattle, setGoingToBattle] = useState(false);
  function handleGo() {
    if (goingToBattle) return;
    setGoingToBattle(true);
    if (mode === "online") {
      if (roomRole === "host") {
        createRoom();
      } else if (roomRole === "guest" && roomCode) {
        joinRoom(roomCode);
      } else {
        joinQueue();
      }
    } else if (mode === "ai") {
      // Give AI a random deck and start in one synchronous sequence
      setP2Deck(buildRandomDeck());
      useGameStore.getState().startLocalBattle();
    } else {
      startLocalBattle();
    }
    // Screen transition clears this component but reset anyway as safety
    setTimeout(() => setGoingToBattle(false), 500);
  }

  const p1Ready = p1Deck.length === DECK_SIZE && p1Deck.some((c) => c.type === "unit" && c.isLord);
  const p2Ready = p2Deck.length === DECK_SIZE && p2Deck.some((c) => c.type === "unit" && c.isLord);
  const canBattle = singleDeck ? p1Ready : p1Ready && p2Ready;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <CardInspector />
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen("menu")}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Back
          </button>
          <h1 className="text-xl font-bold tracking-tight">Deck Builder</h1>
          {mode === "online" && (
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2 py-0.5">
              {roomRole === "host"
                ? "Play with Friend"
                : roomRole === "guest"
                  ? `Join ${roomCode ?? ""}`
                  : "Online"}
            </span>
          )}
          {mode === "ai" && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5">
              VS Computer
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={clearDeck}
            className="px-3 py-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={autoFill}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-lg text-sm transition-colors"
          >
            Auto Fill
          </button>
          <button
            onClick={canBattle && !goingToBattle ? handleGo : undefined}
            disabled={!canBattle || goingToBattle}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${
              canBattle
                ? singleDeck
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/20 text-white"
                  : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/20 text-white"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            {mode === "online"
              ? roomRole === "host"
                ? "Create Room"
                : roomRole === "guest"
                  ? "Join Game"
                  : "Find Match"
              : "Battle!"}
          </button>
        </div>
      </div>

      <div className="flex gap-6 p-6">
        {/* Card Collection */}
        <div className="flex-1 min-w-0">
          {/* Player toggle + tabs */}
          <div className="flex items-center gap-4 mb-4">
            {!singleDeck && (
              <div className="flex bg-gray-900 rounded-lg p-0.5 border border-white/5">
                <button
                  onClick={() => setBuildingFor(1)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    buildingFor === 1
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Player 1
                </button>
                <button
                  onClick={() => setBuildingFor(2)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    buildingFor === 2
                      ? "bg-red-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Player 2
                </button>
              </div>
            )}

            <div className="flex gap-1">
              {tabs.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    i === activeTab
                      ? "bg-white/10 text-white font-medium"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 text-[10px] opacity-50">
                    {tab.cards.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cards grid */}
          <div className="flex flex-wrap gap-3">
            {tabs[activeTab].cards.map((card) => {
              const copies = currentDeck.filter((c) => c.id === card.id).length;
              const maxed = copies >= MAX_CARD_COPIES || (card.type === "unit" && card.isLord && copies >= 1);
              const deckFull = currentDeck.length >= DECK_SIZE;

              return (
                <div key={card.id} className="relative">
                  <CardView
                    card={card}
                    onClick={() => addCard(card)}
                    disabled={maxed || deckFull}
                  />
                  {copies > 0 && (
                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {copies}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Deck panels */}
        <div className="shrink-0 space-y-4">
          <DeckPanel
            label={singleDeck ? "Your Deck" : "Player 1"}
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
        </div>
      </div>
    </div>
  );
}
