import { useFxStore, isMagicalAttack } from "../../store/fxStore";
import type { CombatFx as FxType, FxSide } from "../../store/fxStore";
import type { AttackType, FieldPosition } from "@cards/shared";

/**
 * Transparent overlay that paints any active combat effects for a single
 * field slot. Sits above card content, below UI chrome, and is strictly
 * decorative — no pointer events.
 *
 * Implementation note: we subscribe to the whole `effects` array (stable
 * reference between spawn/expire events) and filter in-component rather
 * than selecting with `.filter(...)`. Selecting a derived array would give
 * a fresh reference every render and cause useSyncExternalStore to loop.
 */
export function CombatFx({ side, pos }: { side: FxSide; pos: FieldPosition }) {
  const all = useFxStore((s) => s.effects);
  const effects = all.filter(
    (e) => e.side === side && e.pos.row === pos.row && e.pos.col === pos.col,
  );
  if (effects.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible z-20">
      {effects.map((fx) => (
        <FxInstance key={fx.id} fx={fx} />
      ))}
    </div>
  );
}

function FxInstance({ fx }: { fx: FxType }) {
  const color = colorFor(fx.attackType);
  const magical = isMagicalAttack(fx.attackType) || fx.kind === "magical";

  return (
    <>
      {/* Full-slot flash tinted by element */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}cc 0%, ${color}33 45%, transparent 70%)`,
          animation: "fxFlash 500ms ease-out forwards",
          animationDelay: fx.isCounter ? "60ms" : "0ms",
          mixBlendMode: "screen",
        }}
      />

      {magical ? (
        // Magical: expanding ring
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            animation: "fxRing 550ms ease-out forwards",
            animationDelay: fx.isCounter ? "60ms" : "0ms",
          }}
        >
          <div
            className="w-20 h-20 rounded-full"
            style={{
              border: `3px solid ${color}`,
              boxShadow: `0 0 24px ${color}`,
            }}
          />
        </div>
      ) : (
        // Physical: slash streak
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            animation: "fxSlash 420ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            animationDelay: fx.isCounter ? "60ms" : "0ms",
          }}
        >
          <div
            className="h-1.5 w-28 rounded-full origin-left"
            style={{
              background: `linear-gradient(90deg, transparent, ${color} 40%, #fff 55%, ${color} 70%, transparent)`,
              boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
              transformOrigin: "left center",
            }}
          />
        </div>
      )}

      {/* Damage number */}
      <div
        className="absolute left-1/2 top-6 -translate-x-1/2 select-none"
        style={{
          animation: "fxDamageFloat 650ms ease-out forwards",
          animationDelay: fx.isCounter ? "100ms" : "0ms",
        }}
      >
        <div
          className="font-black leading-none"
          style={{
            fontSize: fx.isCounter ? 22 : 30,
            color: fx.isCounter ? "#fde68a" : "#fff",
            textShadow: `0 0 10px ${color}, 0 0 20px ${color}cc, 0 2px 3px rgba(0,0,0,0.9)`,
            letterSpacing: "-0.02em",
          }}
        >
          -{fx.amount}
        </div>
        {fx.isCounter && (
          <div
            className="text-[10px] font-bold text-amber-300/90 tracking-wider text-center mt-0.5"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
          >
            COUNTER
          </div>
        )}
      </div>
    </>
  );
}

function colorFor(type: AttackType | null | undefined): string {
  switch (type) {
    case "sword": return "#ef4444";
    case "axe": return "#22c55e";
    case "lance": return "#3b82f6";
    case "bow": return "#eab308";
    case "fire": return "#f97316";
    case "wind": return "#10b981";
    case "thunder": return "#a855f7";
    default: return "#f3f4f6"; // tactic / item damage — neutral white
  }
}
