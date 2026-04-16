import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { CardView } from "./CardView";

export function CardInspector() {
  const inspectedCard = useGameStore((s) => s.inspectedCard);
  const setInspectedCard = useGameStore((s) => s.setInspectedCard);
  // Subscribe to gameState so the modal re-renders when unit stats mutate
  // (HP changes, buffs, etc.). The inspectedCard reference itself may not
  // change, but its nested stats can.
  useGameStore((s) => s.gameState);

  // Close on Escape key
  useEffect(() => {
    if (!inspectedCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectedCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspectedCard, setInspectedCard]);

  if (!inspectedCard) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[slideUp_0.15s_ease-out]"
      onClick={() => setInspectedCard(null)}
    >
      <div
        className="relative flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="scale-150 origin-center">
          <CardView card={inspectedCard} fullArt />
        </div>

        <button
          onClick={() => setInspectedCard(null)}
          className="mt-4 px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white/80 transition-colors"
        >
          Close (Esc)
        </button>
      </div>
    </div>
  );
}
