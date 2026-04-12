import { useEffect, useRef, useState } from "react";

interface EnergyBarProps {
  current: number;
  max: number;
}

/**
 * Amber-dot energy indicator with a red-flash animation when energy is spent.
 * The flash effect is stateful — it uses a prev-value ref to detect decreases.
 */
export function EnergyBar({ current, max }: EnergyBarProps) {
  const prevRef = useRef(current);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (current < prevRef.current) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 400);
      return () => clearTimeout(t);
    }
    prevRef.current = current;
  }, [current]);

  return (
    <div className={`flex items-center gap-1.5 transition-all ${flashing ? "scale-110" : ""}`}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${dotClass(i, current, prevRef.current, flashing)}`}
        />
      ))}
      <span className={`text-xs font-bold ml-1 transition-colors ${flashing ? "text-red-400" : "text-amber-400"}`}>
        {current}/{max}
      </span>
    </div>
  );
}

function dotClass(index: number, current: number, prev: number, flashing: boolean): string {
  if (index < current) return "bg-amber-400 shadow-sm shadow-amber-400/50";
  if (flashing && index >= current && index < prev) return "bg-red-500 animate-pulse";
  return "bg-gray-700 border border-gray-600";
}
