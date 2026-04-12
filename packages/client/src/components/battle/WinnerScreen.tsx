interface WinnerScreenProps {
  didWin: boolean;
  winnerName: string;
  turnCount: number;
  onBackToMenu: () => void;
}

/** Final "Victory" / "Defeat" screen shown when the game ends. */
export function WinnerScreen({ didWin, winnerName, turnCount, onBackToMenu }: WinnerScreenProps) {
  const gradient = didWin
    ? "from-amber-300 to-amber-500"
    : "from-gray-400 to-gray-500";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-gray-900 to-black">
      <div className={`text-6xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        {didWin ? "Victory" : "Defeat"}
      </div>
      <div className="text-2xl font-bold text-white/80">{winnerName}</div>
      <div className="text-sm text-white/40">{turnCount} turns</div>
      <button
        onClick={onBackToMenu}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/20 mt-4"
      >
        Back to Menu
      </button>
    </div>
  );
}
