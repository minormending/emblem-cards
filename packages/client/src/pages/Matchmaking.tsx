import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export function Matchmaking() {
  const { queuePosition, leaveQueue, leaveRoom, roomRole, roomCode } = useGameStore();
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
    : `${seconds}s`;

  const cancel = () => {
    if (roomRole === "host") leaveRoom();
    else leaveQueue();
  };

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore — clipboard may be blocked. Code is still visible on screen.
    }
  };

  // ── Host: show code + waiting for friend ──
  if (roomRole === "host") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-gray-950 to-black">
        <div className="text-center">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-2">Share this code</h2>
          <p className="text-xs text-white/40 mb-4">Your friend enters it in "Join with Code"</p>
        </div>

        {roomCode ? (
          <button
            onClick={copyCode}
            className="group relative px-8 py-6 bg-gradient-to-br from-purple-600/30 to-purple-800/30 border-2 border-purple-500/50 rounded-2xl hover:border-purple-400 transition-colors"
            title="Click to copy"
          >
            <div className="font-mono text-6xl font-black tracking-[0.3em] text-purple-200">
              {roomCode}
            </div>
            <div className="text-[10px] text-white/40 mt-2 uppercase tracking-widest">
              {copied ? "Copied!" : "Click to copy"}
            </div>
          </button>
        ) : (
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        )}

        <div className="text-center">
          <p className="text-sm text-white/50">Waiting for opponent…</p>
          <p className="text-xs text-white/30 mt-1">{timeStr}</p>
        </div>

        <button
          onClick={cancel}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Guest: joining a known code ──
  if (roomRole === "guest") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-gray-950 to-black">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">Joining {roomCode}</h2>
          <p className="text-sm text-white/40">Connecting to your friend's room…</p>
        </div>
        <button
          onClick={cancel}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Default: public matchmaking queue ──
  const isLong = elapsed > 30;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-gray-950 to-black">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />

      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">Finding Opponent</h2>
        <p className="text-sm text-white/40">
          {queuePosition > 0
            ? `Position in queue: ${queuePosition}`
            : "Connecting..."}
        </p>
        <p className={`text-xs mt-2 ${isLong ? "text-amber-400" : "text-white/25"}`}>
          Waiting {timeStr}
        </p>
        {isLong && (
          <p className="text-[11px] text-white/30 mt-1">
            Tip: Use "Play with Friend" for a private code-share match
          </p>
        )}
      </div>

      <button
        onClick={cancel}
        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
