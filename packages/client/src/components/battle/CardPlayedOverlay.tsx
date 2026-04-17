import { useFxStore } from "../../store/fxStore";
import { CardView } from "../CardView";

/**
 * Center-screen overlay that flashes a non-unit card when it's played. One
 * entry per spawned PlayedCardFx in the store — the store auto-removes them
 * after PLAYED_CARD_DURATION_MS so the lifecycle lives there, not here.
 *
 * Kept out of the interaction layer with `pointer-events-none` so a quick
 * overlay doesn't block clicks on the board underneath.
 */
export function CardPlayedOverlay() {
  const playedCards = useFxStore((s) => s.playedCards);
  if (playedCards.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {playedCards.map((fx) => (
        <div key={fx.id} className="absolute flex flex-col items-center gap-2 animate-card-float">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 drop-shadow-lg">
            {labelFor(fx)}
          </div>
          <div className="scale-[1.15] drop-shadow-[0_0_32px_rgba(251,191,36,0.4)]">
            <CardView card={fx.card} />
          </div>
        </div>
      ))}
    </div>
  );
}

function labelFor(fx: { kind: string; ownerSide?: string }): string {
  const prefix = fx.ownerSide === "enemy" ? "Opponent: " : "";
  switch (fx.kind) {
    case "item":
      return `${prefix}Item played`;
    case "weapon":
      return `${prefix}Weapon equipped`;
    case "support":
      return `${prefix}Support activated`;
    default:
      return "";
  }
}
