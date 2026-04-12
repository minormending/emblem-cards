import type { Card } from "@cards/shared";
import { CardView } from "./CardView";

interface HandViewProps {
  hand: Card[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  isActive: boolean;
  energy: number;
}

export function HandView({ hand, selectedIndex, onSelect, isActive, energy }: HandViewProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-2 min-h-[140px]">
      {hand.map((card, i) => {
        const tooExpensive = card.cost > energy;
        return (
          <div key={`${card.id}-${i}`} className="shrink-0">
            <CardView
              card={card}
              small
              selected={selectedIndex === i}
              disabled={!isActive || tooExpensive}
              energyShort={isActive && tooExpensive ? card.cost - energy : undefined}
              onClick={() => onSelect(i)}
            />
          </div>
        );
      })}
      {hand.length === 0 && (
        <div className="flex items-center justify-center w-full text-sm opacity-30">
          No cards in hand
        </div>
      )}
    </div>
  );
}
