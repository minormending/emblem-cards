import { useState } from "react";

interface HowToPlayProps {
  onClose: () => void;
}

interface Page {
  title: string;
  body: React.ReactNode;
}

const pages: Page[] = [
  {
    title: "How to Win",
    body: (
      <>
        <p className="text-white/80">
          Each player builds a 15-card deck with exactly <strong>one Lord</strong> — your commander.
        </p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <div className="font-bold text-amber-300 mb-1">You win when either:</div>
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li>You defeat the enemy <span className="text-amber-300">Lord</span></li>
            <li>Your opponent has no units left and no units in their deck</li>
            <li>Your opponent runs out of cards</li>
          </ul>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
          <div className="font-bold text-red-300 mb-1">You lose if:</div>
          <ul className="list-disc list-inside space-y-1 text-white/70">
            <li>Your Lord is defeated</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    title: "The Battlefield",
    body: (
      <>
        <p className="text-white/80">
          Each side has <strong>two rows of three slots</strong>: a <em className="text-red-300">front row</em> and a <em className="text-blue-300">back row</em>.
        </p>
        <div className="flex flex-col items-center gap-1 my-2">
          <div className="text-[10px] text-white/40">Opponent</div>
          <div className="flex gap-1">
            <div className="w-12 h-8 border border-white/20 rounded bg-gray-800/40 flex items-center justify-center text-[10px] opacity-60">back</div>
            <div className="w-12 h-8 border border-white/20 rounded bg-gray-800/40 flex items-center justify-center text-[10px] opacity-60">back</div>
            <div className="w-12 h-8 border border-white/20 rounded bg-gray-800/40 flex items-center justify-center text-[10px] opacity-60">back</div>
          </div>
          <div className="flex gap-1">
            <div className="w-12 h-8 border border-red-400/50 rounded bg-red-950/40 flex items-center justify-center text-[10px]">front</div>
            <div className="w-12 h-8 border border-red-400/50 rounded bg-red-950/40 flex items-center justify-center text-[10px]">front</div>
            <div className="w-12 h-8 border border-red-400/50 rounded bg-red-950/40 flex items-center justify-center text-[10px]">front</div>
          </div>
          <div className="h-px w-32 bg-white/10 my-1" />
          <div className="flex gap-1">
            <div className="w-12 h-8 border border-red-400/50 rounded bg-red-950/40 flex items-center justify-center text-[10px]">front</div>
            <div className="w-12 h-8 border border-red-400/50 rounded bg-red-950/40 flex items-center justify-center text-[10px]">front</div>
            <div className="w-12 h-8 border border-red-400/50 rounded bg-red-950/40 flex items-center justify-center text-[10px]">front</div>
          </div>
          <div className="flex gap-1">
            <div className="w-12 h-8 border border-blue-400/50 rounded bg-blue-950/40 flex items-center justify-center text-[10px]">back</div>
            <div className="w-12 h-8 border border-blue-400/50 rounded bg-blue-950/40 flex items-center justify-center text-[10px]">back</div>
            <div className="w-12 h-8 border border-blue-400/50 rounded bg-blue-950/40 flex items-center justify-center text-[10px]">back</div>
          </div>
          <div className="text-[10px] text-white/40">You</div>
        </div>
        <ul className="text-sm text-white/70 list-disc list-inside space-y-1">
          <li>Front-row units can attack the enemy front row.</li>
          <li>Back-row units <strong>cannot attack</strong> unless they are ranged or flying.</li>
          <li>Archers, mages, and flyers can hit the back row through gaps.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Your Turn",
    body: (
      <>
        <p className="text-white/80">
          On your turn you can do as much as your <span className="text-amber-300 font-bold">energy</span> allows.
        </p>
        <div className="space-y-2 text-sm text-white/80">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold w-4">1.</span>
            <span><strong className="text-emerald-300">Deploy cards</strong> from your hand. Click a card, then click a field slot. Each card costs energy.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold w-4">2.</span>
            <span><strong className="text-red-300">Attack</strong> with your units. Click one of your units on the field, then click an enemy to fight.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold w-4">3.</span>
            <span><strong className="text-amber-300">End turn.</strong> You draw a card and get more energy next turn.</span>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-white/70">
          <strong className="text-blue-300">Tip:</strong> Units you just deployed can&apos;t attack until next turn. Each unit can only attack once per turn.
        </div>
      </>
    ),
  },
  {
    title: "Combat Basics",
    body: (
      <>
        <p className="text-white/80">
          Physical attacks deal <strong>STR − DEF</strong> damage. Magic deals <strong>MAG − RES</strong>.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs font-bold text-white/60 mb-2">Weapon Triangle</div>
          <div className="flex justify-around text-sm">
            <span className="text-red-400">Sword</span>
            <span className="text-white/30">→ beats →</span>
            <span className="text-emerald-400">Axe</span>
            <span className="text-white/30">→ beats →</span>
            <span className="text-blue-400">Lance</span>
            <span className="text-white/30">→ beats →</span>
            <span className="text-red-400">Sword</span>
          </div>
          <div className="text-[10px] text-white/40 mt-2">Advantage gives +2 ATK in that fight.</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-xs font-bold text-white/60 mb-2">Magic Triangle</div>
          <div className="flex justify-around text-sm">
            <span className="text-orange-400">Fire</span>
            <span className="text-white/30">→</span>
            <span className="text-emerald-400">Wind</span>
            <span className="text-white/30">→</span>
            <span className="text-purple-400">Thunder</span>
            <span className="text-white/30">→</span>
            <span className="text-orange-400">Fire</span>
          </div>
        </div>
        <div className="text-xs text-white/60">
          Archers deal <span className="text-amber-300 font-bold">3× damage vs flying</span>. Hammers deal <span className="text-amber-300 font-bold">2× vs armored</span>.
        </div>
      </>
    ),
  },
  {
    title: "Cards & Effects",
    body: (
      <>
        <p className="text-white/80">Your deck has five kinds of cards:</p>
        <div className="space-y-1.5 text-sm">
          <div className="bg-white/5 border-l-2 border-gray-400 pl-2 py-1">
            <strong>Units</strong> — warriors you deploy to fight.
          </div>
          <div className="bg-white/5 border-l-2 border-emerald-500 pl-2 py-1">
            <strong className="text-emerald-300">Weapons</strong> — equip to a unit of matching type. Bows grant <em>ranged</em>.
          </div>
          <div className="bg-white/5 border-l-2 border-amber-500 pl-2 py-1">
            <strong className="text-amber-300">Items</strong> — potions, buffs, healing.
          </div>
          <div className="bg-white/5 border-l-2 border-sky-500 pl-2 py-1">
            <strong className="text-sky-300">Supports</strong> — grant bonuses when specific classes are paired on your field.
          </div>
          <div className="bg-white/5 border-l-2 border-purple-500 pl-2 py-1">
            <strong className="text-purple-300">Tactics</strong> — one-shot effects like damage, draws, and reposition.
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-white/70">
          <strong className="text-blue-300">Right-click any card</strong> to inspect it in detail. Click cards you can&apos;t afford to see their full text.
        </div>
      </>
    ),
  },
  {
    title: "Keyword Glossary",
    body: (
      <>
        <p className="text-white/80">
          Keywords appear on cards as special abilities. Here&apos;s what they do:
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="bg-white/5 border-l-2 border-amber-500 pl-2 py-1">
            <strong className="text-amber-300">Ranged</strong>
            <span className="text-white/70"> — Can attack from the back row and target enemy back-row units.</span>
          </div>
          <div className="bg-white/5 border-l-2 border-cyan-500 pl-2 py-1">
            <strong className="text-cyan-300">Flying</strong>
            <span className="text-white/70"> — Same as Ranged, but takes bonus damage from anti-flying effects (e.g. bows).</span>
          </div>
          <div className="bg-white/5 border-l-2 border-red-500 pl-2 py-1">
            <strong className="text-red-300">Riposte</strong>
            <span className="text-white/70"> — Always counter-attacks when hit, even against ranged attackers.</span>
          </div>
          <div className="bg-white/5 border-l-2 border-orange-500 pl-2 py-1">
            <strong className="text-orange-300">Pierce</strong>
            <span className="text-white/70"> — Ignores 50% of the target&apos;s DEF during damage calculation.</span>
          </div>
          <div className="bg-white/5 border-l-2 border-violet-500 pl-2 py-1">
            <strong className="text-violet-300">Shatter</strong>
            <span className="text-white/70"> — Permanently reduces the target&apos;s DEF after dealing damage.</span>
          </div>
          <div className="bg-white/5 border-l-2 border-pink-500 pl-2 py-1">
            <strong className="text-pink-300">Suppress</strong>
            <span className="text-white/70"> — Permanently reduces the target&apos;s ATK after dealing damage.</span>
          </div>
          <div className="bg-white/5 border-l-2 border-emerald-500 pl-2 py-1">
            <strong className="text-emerald-300">Reposition</strong>
            <span className="text-white/70"> — Swap a unit between the front and back row in the same column.</span>
          </div>
          <div className="bg-white/5 border-l-2 border-yellow-500 pl-2 py-1">
            <strong className="text-yellow-300">Attacks Twice</strong>
            <span className="text-white/70"> — This unit hits twice per attack action.</span>
          </div>
        </div>
      </>
    ),
  },
];

export function HowToPlay({ onClose }: HowToPlayProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex];
  const isLast = pageIndex === pages.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-4">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setPageIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === pageIndex ? "w-6 bg-amber-400" : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <h2 className="text-xl font-black mb-3 bg-gradient-to-r from-amber-300 to-red-400 bg-clip-text text-transparent">
          {page.title}
        </h2>

        <div className="space-y-3 mb-5 min-h-[280px]">{page.body}</div>

        <div className="flex gap-2">
          {pageIndex > 0 && (
            <button
              onClick={() => setPageIndex((i) => i - 1)}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) onClose();
              else setPageIndex((i) => i + 1);
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              isLast
                ? "bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20"
                : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white"
            }`}
          >
            {isLast ? "Let's Play!" : "Next"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 py-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
}
