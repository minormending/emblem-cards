import { useEffect, useRef } from "react";
import { useLogStore, type LogEntry } from "../store/logStore";

const typeColors: Record<LogEntry["type"], string> = {
  deploy: "text-emerald-400",
  attack: "text-red-400",
  item: "text-amber-400",
  "end-turn": "text-gray-500",
  ko: "text-red-300 font-bold",
  system: "text-blue-400",
};

const typeIcons: Record<LogEntry["type"], string> = {
  deploy: "+",
  attack: "!",
  item: "*",
  "end-turn": "-",
  ko: "x",
  system: "~",
};

export function GameLog() {
  const entries = useLogStore((s) => s.entries);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-2 py-1.5 border-b border-white/5">
        Battle Log
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-1.5 text-[11px] leading-tight">
            <span className={`${typeColors[entry.type]} shrink-0 w-3 text-center`}>
              {typeIcons[entry.type]}
            </span>
            <span className="text-gray-500 shrink-0">T{entry.turn}</span>
            <span className={typeColors[entry.type]}>{entry.text}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-[11px] text-white/20 py-4 text-center">
            No actions yet
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
