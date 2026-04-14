import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { getDisplayName, setDisplayName, getPlayerId } from "../lib/identity";
import { hasSeenTutorial, markTutorialSeen, resetTutorial } from "../lib/firstTime";
import { HowToPlay } from "../components/HowToPlay";

export function Menu() {
  const { setMode, setScreen, quickStart } = useGameStore();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(getDisplayName());
  const [editingName, setEditingName] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);

  // Auto-show tutorial on first-ever visit
  useEffect(() => {
    if (!hasSeenTutorial()) {
      setShowTutorial(true);
    }
  }, []);

  function closeTutorial() {
    markTutorialSeen();
    setShowTutorial(false);
  }

  function commitName(value: string) {
    const clean = value.trim().slice(0, 20);
    if (clean) {
      setDisplayName(clean);
      setName(clean);
    }
    setEditingName(false);
  }

  function handleClick(fn: () => void) {
    if (busy) return;
    setBusy(true);
    fn();
    setTimeout(() => setBusy(false), 300);
  }

  function goLocal() {
    setMode("local");
    setScreen("deck-builder");
  }

  function goOnline() {
    setMode("online");
    useGameStore.setState({ roomRole: "queue", roomCode: null });
    setScreen("deck-builder");
  }

  function goHost() {
    setMode("online");
    useGameStore.setState({ roomRole: "host", roomCode: null });
    setScreen("deck-builder");
  }

  function goJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) return;
    setMode("online");
    useGameStore.setState({ roomRole: "guest", roomCode: code });
    setScreen("deck-builder");
  }

  function goAIDeckBuilder() {
    setMode("ai");
    setScreen("deck-builder");
  }

  function replayTutorial() {
    // Reset so contextual battle hints show again too
    resetTutorial();
    setShowTutorial(true);
  }

  const playerId = getPlayerId();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-gray-950 to-black">
      {showTutorial && <HowToPlay onClose={closeTutorial} />}

      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-red-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Emblem Cards
        </h1>
        <p className="text-sm text-white/30">Tactical card battles on a 2×3 grid</p>
      </div>

      {/* Identity card */}
      <div className="w-64 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center text-gray-900 font-black">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              defaultValue={name}
              maxLength={20}
              onBlur={(e) => commitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName((e.target as HTMLInputElement).value);
                if (e.key === "Escape") setEditingName(false);
              }}
              className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-sm text-white outline-none focus:border-amber-400"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-left w-full"
            >
              <div className="text-sm font-bold truncate">{name}</div>
              <div className="text-[10px] text-white/30 font-mono truncate">
                {playerId.slice(0, 8)}...
              </div>
            </button>
          )}
        </div>
        {!editingName && (
          <button
            onClick={() => setEditingName(true)}
            className="text-[10px] text-white/40 hover:text-white transition-colors"
          >
            edit
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 w-64">
        <button
          onClick={() => handleClick(quickStart)}
          disabled={busy}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 rounded-xl font-black text-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Quick Start
        </button>
        <p className="text-[11px] text-white/25 text-center -mt-1">
          Random decks vs AI, straight to battle
        </p>

        <div className="border-t border-white/5 my-2" />

        <button
          onClick={() => handleClick(goAIDeckBuilder)}
          disabled={busy}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          VS Computer
        </button>
        <p className="text-[11px] text-white/25 text-center -mt-1">
          Build your deck, fight the AI
        </p>

        <button
          onClick={() => handleClick(goLocal)}
          disabled={busy}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          Local 2P
        </button>
        <p className="text-[11px] text-white/25 text-center -mt-1">
          Two players, one screen
        </p>

        <button
          onClick={() => handleClick(goHost)}
          disabled={busy}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
        >
          Play with Friend
        </button>
        <p className="text-[11px] text-white/25 text-center -mt-1">
          Get a code to share with your friend
        </p>

        {showJoin ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleClick(goJoin);
                  setShowJoin(false);
                }
                if (e.key === "Escape") {
                  setShowJoin(false);
                  setJoinCode("");
                }
              }}
              placeholder="CODE"
              maxLength={4}
              className="flex-1 px-3 py-3 bg-black/40 border border-purple-500/40 rounded-xl font-mono text-center tracking-[0.4em] text-lg font-bold outline-none focus:border-purple-400"
            />
            <button
              onClick={() => {
                if (joinCode.trim().length === 4) handleClick(goJoin);
              }}
              disabled={joinCode.trim().length !== 4}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowJoin(true)}
            disabled={busy}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          >
            Join with Code
          </button>
        )}
        <p className="text-[11px] text-white/25 text-center -mt-1">
          Enter a 4-letter code from a friend
        </p>

        <button
          onClick={() => handleClick(goOnline)}
          disabled={busy}
          className="w-full py-2 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          Random online match
        </button>

        <div className="border-t border-white/5 my-2" />

        <button
          onClick={replayTutorial}
          className="w-full py-2 text-xs text-white/50 hover:text-amber-400 hover:bg-amber-500/5 rounded-lg transition-colors"
        >
          How to Play
        </button>
      </div>

      <p className="text-[10px] text-white/20 max-w-xs text-center">
        No accounts. No passwords. Your identity lives only in this browser.
      </p>
    </div>
  );
}
