import type { FieldPosition } from "@cards/shared";

interface ActionHintProps {
  selectedHandIndex: number | null;
  selectedAttackerPos: FieldPosition | null;
  isMyTurn: boolean;
}

/**
 * Contextual banner under the top bar that tells the player what to do next.
 * Has three states:
 *   - "waiting for opponent" (not their turn)
 *   - "select a slot to deploy" (card selected)
 *   - "select an enemy to attack" (attacker selected)
 * Renders nothing when the player has no pending selection.
 */
export function ActionHint({ selectedHandIndex, selectedAttackerPos, isMyTurn }: ActionHintProps) {
  if (!isMyTurn) {
    return <Hint tone="neutral">Waiting for opponent...</Hint>;
  }
  if (selectedHandIndex !== null) {
    return <Hint tone="deploy">Select a field slot to deploy &middot; Click card again to cancel</Hint>;
  }
  if (selectedAttackerPos) {
    return <Hint tone="attack">Select an enemy unit to attack &middot; Click your unit again to cancel</Hint>;
  }
  return null;
}

function Hint({ tone, children }: { tone: "neutral" | "deploy" | "attack"; children: React.ReactNode }) {
  const style = {
    neutral: "text-gray-400 bg-gray-800/50 border-white/5",
    deploy: "text-emerald-300 bg-emerald-900/30 border-emerald-500/20",
    attack: "text-red-300 bg-red-900/30 border-red-500/20",
  }[tone];

  return <div className={`text-center py-1.5 text-sm border-y ${style}`}>{children}</div>;
}
