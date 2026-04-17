import { useState } from "react";
import { useGameStore } from "../store/gameStore";

export function ModeSelect() {
  const { setMode, setScreen, quickStart } = useGameStore();
  const [busy, setBusy] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  function handleClick(fn: () => void) {
    if (busy) return;
    setBusy(true);
    fn();
    setTimeout(() => setBusy(false), 300);
  }

  function goAI() {
    setMode("ai");
    setScreen("deck-builder");
  }

  function goTournament() {
    setMode("tournament");
    setScreen("tournament-home");
  }

  function goLocal() {
    setMode("local");
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

  function goOnline() {
    setMode("online");
    useGameStore.setState({ roomRole: "queue", roomCode: null });
    setScreen("deck-builder");
  }

  const modes = [
    { name: "VS AI", brief: "Build your deck, fight the AI", color: "bg-blue-500", action: goAI },
    { name: "Tournament", brief: "8-opponent ladder, unlock cards", color: "bg-amber-500", action: goTournament },
    { name: "Local Duel", brief: "Two players, one screen", color: "bg-gray-500", action: goLocal },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-950 to-black">
      {/* Top bar */}
      <div className="w-full max-w-md px-4 pt-6 pb-2">
        <button
          onClick={() => setScreen("menu")}
          className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-md px-4 pb-12">
        {/* Quick Start banner */}
        <button
          onClick={() => handleClick(quickStart)}
          disabled={busy}
          className="w-full py-4 px-5 bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-black text-lg leading-tight">Quick Start</div>
            <div className="text-white/60 text-xs">Random decks vs AI — straight to battle</div>
          </div>
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-[10px] text-white/25 uppercase tracking-widest">Choose Mode</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Mode dossier rows */}
        <div className="w-full flex flex-col gap-2">
          {modes.map((m) => (
            <button
              key={m.name}
              onClick={() => handleClick(m.action)}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50 group"
            >
              <div className={`w-1 h-8 rounded-full ${m.color} flex-shrink-0`} />
              <div className="flex-1 text-left">
                <div className="font-bold text-sm">{m.name}</div>
                <div className="text-white/40 text-xs">{m.brief}</div>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          {/* Online row — expandable */}
          {!showOnline ? (
            <button
              onClick={() => setShowOnline(true)}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50 group"
            >
              <div className="w-1 h-8 rounded-full bg-purple-500 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-bold text-sm">Online</div>
                <div className="text-white/40 text-xs">Host, join, or find a match</div>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-full bg-white/5 border border-purple-500/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full bg-purple-500" />
                  <span className="font-bold text-sm">Online</span>
                </div>
                <button
                  onClick={() => { setShowOnline(false); setShowJoin(false); setJoinCode(""); }}
                  className="text-[10px] text-white/40 hover:text-white transition-colors"
                >
                  close
                </button>
              </div>

              <div className="p-2 flex flex-col gap-1.5">
                <button
                  onClick={() => handleClick(goHost)}
                  disabled={busy}
                  className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-xs transition-all disabled:opacity-50 text-left"
                >
                  Host — share a code
                </button>

                {showJoin ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleClick(goJoin);
                        if (e.key === "Escape") { setShowJoin(false); setJoinCode(""); }
                      }}
                      placeholder="CODE"
                      maxLength={4}
                      className="flex-1 px-3 py-2.5 bg-black/40 border border-purple-500/40 rounded-lg font-mono text-center tracking-[0.4em] text-sm font-bold outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={() => { if (joinCode.trim().length === 4) handleClick(goJoin); }}
                      disabled={joinCode.trim().length !== 4}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Go
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowJoin(true)}
                    className="w-full py-2.5 px-3 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-lg font-bold text-xs transition-all text-left"
                  >
                    Join with code
                  </button>
                )}

                <button
                  onClick={() => handleClick(goOnline)}
                  disabled={busy}
                  className="w-full py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Random match
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
