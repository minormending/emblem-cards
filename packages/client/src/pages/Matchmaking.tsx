import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export function Matchmaking() {
  const { queuePosition, leaveQueue } = useGameStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
    : `${seconds}s`;

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
            Tip: Open another browser tab to test online mode
          </p>
        )}
      </div>

      <button
        onClick={leaveQueue}
        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
