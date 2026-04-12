interface TurnBannerProps {
  playerName: string;
  turnNumber: number;
  isMyTurn: boolean;
}

/** Pill in the top bar showing whose turn it is + the turn counter. */
export function TurnBanner({ playerName, turnNumber, isMyTurn }: TurnBannerProps) {
  const pillClass = isMyTurn
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs opacity-40">Turn {turnNumber}</div>
      <div className={`px-3 py-1 rounded-full text-sm font-bold border ${pillClass}`}>
        {isMyTurn ? "Your Turn" : `${playerName}'s Turn`}
      </div>
    </div>
  );
}
