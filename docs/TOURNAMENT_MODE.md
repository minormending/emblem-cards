# Tournament Mode — Implementation Plan

Status: **Planning** — not yet implemented.

This document specifies a new single-player **Tournament** mode for Emblem Cards.
It is written to be split across multiple implementation agents; Section 10
("Work Breakdown") assigns each concern to a discrete agent.

---

## 1. Overview

Tournament mode is a single-player ladder of **8 themed AI opponents**,
ascending in difficulty. The player enters with a curated **starter pool** of
cards and unlocks **one new card per victory**. Cleared opponents stay cleared.
Completing the ladder unlocks the final reward and allows replay.

- **Platform:** both web (`packages/client`) and mobile (`packages/mobile`).
- **Networking:** none. Fully offline. Tournament is AI-only.
- **Persistence:** local (localStorage / AsyncStorage). One save slot.
- **Scope:** reuses the existing battle engine, AI, and deck-builder with
  additions — no changes to core combat rules.

Non-goals:

- No story, dialogue, portraits, or cutscenes.
- No bracket semantics (semifinal / final). It is a linear ladder.
- No online play, no leaderboards, no cloud sync.
- No new card types or new battle mechanics.
- No economy/currency. Unlocks are direct (beat opponent → get card).

---

## 2. User-Facing Flow

```
Menu
 └─ "Tournament"
     └─ Tournament Home
         ├─ Ladder (8 rows: opponent name, tier, status, reward)
         ├─ Collection (cards unlocked so far)
         ├─ "Continue" / "Replay Tournament" / "Reset Tournament" buttons
         └─ Click next unbeaten opponent
             └─ Pre-Match screen (opponent brief + reward preview + "Build Deck")
                 └─ Deck Builder (pool = starter ∪ unlocked; tournament-scoped)
                     └─ Battle (vs scripted AI)
                         ├─ Victory → Reward screen (new card revealed) → Tournament Home
                         └─ Loss → Loss screen → "Retry" or "Back to Home"
```

Key rules:

- **Progress gating:** opponent N+1 is locked until opponent N is beaten.
- **Retry on loss:** no penalty, no reset. Player returns to the same opponent.
- **Deck is saved per tournament.** Between matches, the player may edit their
  deck from the currently unlocked pool only.
- **Completion:** after opponent 8 is beaten, the player sees a Champion
  screen. "Replay Tournament" resets `currentRound` to 0 but **keeps unlocks**
  (replayability is for fun; unlocks are sticky).
- **Reset Tournament** (explicit, confirmed) wipes unlocks and progress.

---

## 3. Content Spec — The 8 Opponents

Each opponent has: a display name, a one-sentence flavor blurb (no story,
just archetype), a **deck archetype**, a **difficulty tier**, an **AI config
preset**, and a single **unlock reward card**. The implementing agent picks
concrete card IDs from `packages/card-engine/src/cards/data/` to fit the
archetype; this doc specifies the intent only.

| # | Name (placeholder)   | Archetype                 | Tier | AI Preset | Reward intent                       |
|---|----------------------|---------------------------|------|-----------|-------------------------------------|
| 1 | Recruit Gareth       | Vanilla infantry swords   | 1    | easy      | A cheap, flexible unit card         |
| 2 | Archer Mila          | Back-row bow spam         | 2    | easy      | A bow-themed weapon or archer       |
| 3 | Cavalier Dorn        | Mounted rush (cost curve) | 3    | medium    | A cavalry unit                      |
| 4 | Skyrider Ilyana      | Flying / Pegasus pressure | 4    | medium    | A flying unit                       |
| 5 | Mage Veyra           | Magic burn / tactics      | 5    | medium    | A damage tactic card                |
| 6 | Armorlord Gorn       | Armored wall, big HP      | 6    | hard      | A high-impact weapon (Silver-tier)  |
| 7 | Shadow Kael          | Thief / disruption / reposition | 7 | hard  | A disruption item                   |
| 8 | Champion Valdis      | Mirror-Lord, well-rounded | 8    | expert    | The "capstone" card (see §3.3)      |

### 3.1. Starter Pool

A curated list of ~18–22 card IDs that every new tournament starts with.
Intent: build a playable but plain deck across all card types (units, weapons,
items, supports, tactics). **Concrete IDs are chosen by the content agent**;
the pool must satisfy:

- At least one Lord (so the player can satisfy the "has Lord" deckbuilding
  constraint, if any).
- Enough units to reach the minimum deck size (per existing deck-builder
  rules — see `packages/client/src/pages/DeckBuilder.tsx`).
- At least one card of each card type (unit, weapon, item, tactic, support).
- No flying, no mounted, no mage archetype cards — those are
  unlocked during the ladder so early opponents feel distinct from the
  player's starter.

The starter pool lives as a `readonly string[]` of card IDs.

### 3.2. Unlock Rewards

Each opponent awards **exactly one card ID**. Rewards must:

- Not duplicate anything in the starter pool.
- Match the beaten opponent's archetype (thematic payoff).
- Be collectively diverse — after a full clear, the player should have access
  to every major archetype (flying, mounted, magic, armor, disruption).

### 3.3. Capstone Reward

The final (#8) reward should be a standout card — either the strongest Lord
variant not in the starter pool, or a card tagged as "rare/boss" by the
content agent. This is the bragging-rights card.

### 3.4. Opponent Decks

Each opponent has a **pre-built deck** defined as a `string[]` of card IDs
(deck encoding follows existing format — see `packages/shared/src/types.ts`
and `packages/client/src/lib/decks.ts`). Decks should:

- Be legal under current deckbuilding rules.
- Thematically match their archetype (≥ 60% of non-Lord/non-generic cards
  should fit the theme).
- Scale in internal synergy with tier (low tiers have looser decks with
  weaker curves; high tiers have tight, tuned decks).

---

## 4. AI Difficulty Tiers

Today `executeAITurn` in
[aiPlayer.ts](packages/battle-engine/src/ai/aiPlayer.ts) scores all legal
actions via `pickBestAction` + `evaluate.ts` heuristics and picks the top
action, looping to ≤100 actions/turn with a score threshold.

Tournament introduces **four difficulty presets**, each a named config
consumed by `executeAITurn`. The AI agent extends the scoring/selection
pipeline with these knobs:

| Preset  | Search depth | Randomness (top-K) | Aggression weight | Threshold |
|---------|--------------|--------------------|-------------------|-----------|
| easy    | 1 (greedy)   | pick from top 3 uniformly | 0.6 (defensive-leaning) | lenient (skip more turns) |
| medium  | 1 (greedy)   | pick from top 2           | 1.0 (balanced)           | current default |
| hard    | 1 (greedy)   | always top 1              | 1.2 (pressure enemy Lord)| strict (play every useful action) |
| expert  | 2 (1-ply lookahead on opponent reply) | top 1 | 1.2 | strict |

Knob semantics the AI agent must implement:

- **Search depth = 2:** after scoring each candidate action, simulate it,
  call the evaluator from the opponent's perspective to estimate their best
  reply, and subtract that from the action's score. Keep it bounded —
  expert depth-2 on a full action space could explode; cap branching to top
  N candidates per level (N≈6 is fine) and avoid exploring end-turn.
- **Randomness (top-K):** rank actions; sample uniformly from the top K
  that exceed threshold. If fewer than K qualify, sample from what's there.
- **Aggression weight:** multiplier applied to the component of the
  evaluation score that represents "damage dealt to enemy Lord / enemy
  field." Existing evaluator likely already separates these; if not, expose
  the component.
- **Threshold:** minimum score for the AI to take an action at all.
  Looser = AI sometimes passes turns / skips marginal plays.

The four presets are exported from the battle-engine so opponent definitions
reference them by name. Presets live alongside the AI code; tournament data
references them by string key.

**Non-goal:** MCTS, minimax > depth 2, or learning. Out of scope.

---

## 5. Data Model & Persistence

### 5.1. Types (new)

Defined in `packages/shared/src/tournament/` so both client and mobile can
import them.

```ts
// packages/shared/src/tournament/types.ts

export type AIDifficulty = "easy" | "medium" | "hard" | "expert";

export interface TournamentOpponent {
  id: string;                 // stable slug, e.g. "recruit-gareth"
  order: number;              // 1..8 — position in ladder
  displayName: string;
  archetype: string;          // short tag, e.g. "flying", for UI grouping/icons
  blurb: string;              // one sentence, no story — "Specializes in sky-borne pressure."
  deck: string[];             // card IDs
  ai: AIDifficulty;
  rewardCardId: string;       // card granted on victory
}

export interface TournamentState {
  version: 1;
  currentRound: number;       // 0..8, index of NEXT unbeaten opponent. 8 = champion cleared.
  unlockedCards: string[];    // card IDs beyond the starter pool
  tournamentDeck: string[] | null;  // last-saved deck for this tournament
  timesCompleted: number;     // increments when champion is beaten
  lastUpdatedAt: number;      // ms epoch
}
```

### 5.2. Storage

- **Key:** `"emblem-tournament/v1"` (mirrors the versioning used by
  `decks.ts`).
- **Web:** `localStorage` via a new
  `packages/client/src/lib/tournament.ts`.
- **Mobile:** `AsyncStorage` via
  `packages/mobile/src/lib/tournament.ts`.
- **API surface (identical on both):**
  ```ts
  loadTournament(): TournamentState
  saveTournament(state: TournamentState): void
  resetTournament(): void   // wipes progress AND unlocks
  replayTournament(): void  // resets currentRound to 0, keeps unlocks
  ```
- **Migration:** none yet. New schema. If version mismatches in future,
  fall back to a fresh state (no data loss concern — progress is replayable).
- **Initial state:** `{ version: 1, currentRound: 0, unlockedCards: [],
  tournamentDeck: null, timesCompleted: 0, lastUpdatedAt: Date.now() }`.

### 5.3. Opponent + starter pool data

Static TypeScript in `packages/shared/src/tournament/`:

- `opponents.ts` — `export const OPPONENTS: readonly TournamentOpponent[]`,
  length 8, `order` values 1..8, sorted.
- `starterPool.ts` — `export const STARTER_POOL: readonly string[]`.
- `index.ts` — barrel export.

Both files must pass a validation test (§10, Agent A) asserting:

- All card IDs resolve to real cards in `card-engine`.
- `rewardCardId` ∉ `STARTER_POOL`.
- Rewards are mutually distinct.
- Decks pass the existing deck-validation helper.

---

## 6. Architecture Changes by Package

### 6.1. `packages/shared`

- Add `tournament/` folder with types, opponents, starter pool, index.
- Export from package entry so both client and mobile import as
  `@cards/shared/tournament` (or nearest equivalent — match existing
  export style).

### 6.2. `packages/battle-engine`

- `src/ai/presets.ts` — new file exporting
  `AI_PRESETS: Record<AIDifficulty, AIConfig>`.
- `src/ai/aiPlayer.ts` — accept an optional `AIConfig` argument to
  `executeAITurn`. Default behavior (no config) = current behavior.
- `src/ai/evaluate.ts` — surface aggression-weighted component if not
  already separable. Add top-K randomized selection path.
- `src/ai/lookahead.ts` (new, optional) — depth-2 evaluator used only by
  `expert` preset.
- Unit tests: each preset runs to completion on a canned game state without
  throwing or exceeding action cap.

### 6.3. `packages/client` (web)

- `src/lib/tournament.ts` — persistence (§5.2).
- `src/store/tournamentStore.ts` (or slice in existing `gameStore.ts`,
  matching current pattern) — tournament state + actions:
  `startOpponent(order)`, `completeMatch(win: boolean)`, `editDeck(cards)`,
  `replayTournament()`, `resetTournament()`.
- `src/pages/TournamentHome.tsx` — ladder + collection view.
- `src/pages/TournamentPreMatch.tsx` — opponent brief + "Build Deck" CTA.
- `src/pages/TournamentReward.tsx` — new card reveal after victory.
- `src/pages/TournamentLoss.tsx` — simple retry screen (can be a modal
  variant of existing post-match screen — agent's choice).
- Deck builder integration: `DeckBuilder` accepts a `poolFilter?:
  ReadonlySet<string>` prop. When set (tournament context), the builder
  only shows cards in the pool. No UI change for existing callers.
- Menu: add "Tournament" entry wired to `setScreen("tournament-home")`.
- Mode extension: in [gameStore.ts](packages/client/src/store/gameStore.ts),
  extend the `screen` union and add a `"tournament"` value to `mode` (or
  handle as a sub-flow of `"ai"` — the implementing agent picks based on
  what touches less existing code; document the decision in the PR).
- Battle wiring: when entering battle from tournament flow, pass the
  opponent's `AIDifficulty` through to the battle engine's AI turn runner.

### 6.4. `packages/mobile`

Mirror of `packages/client`:

- `src/lib/tournament.ts` using AsyncStorage.
- Tournament store slice mirroring web's shape.
- Screens: `TournamentHomeScreen`, `TournamentPreMatchScreen`,
  `TournamentRewardScreen`, `TournamentLossScreen`.
- DeckBuilder screen accepts the same pool filter prop.
- Menu: add "Tournament" button.

Shared visual language with web where practical, but native components —
no webview bridging.

### 6.5. `packages/server`

**No changes.** Tournament is offline-only.

---

## 7. UI Screens — Detail

### 7.1. Tournament Home

- Header: "Tournament" + progress indicator ("3 / 8").
- Ladder: vertical list of 8 opponent rows. Each row:
  - Tier badge (1–8).
  - Opponent name + archetype icon.
  - Status: "Defeated" (checkmark), "Next" (highlighted, clickable), or
    "Locked" (dimmed, not clickable).
  - Reward preview: card back silhouette if locked; card art if defeated.
- "Collection" strip below ladder: horizontal scroll of unlocked cards.
- Footer actions: "Replay Tournament" (only if
  `currentRound === 8`), "Reset Tournament" (always, behind a confirm).

### 7.2. Pre-Match

- Opponent portrait/icon + name + archetype badge.
- Blurb.
- Reward preview: face-down card that flips on victory.
- "Build Deck" button (primary) → deck builder with pool filter.
- "Back" to Tournament Home.

### 7.3. Reward

- Card-reveal animation (reuse whatever card flourish the game already has;
  if none, a simple scale + glow).
- "Add to Collection" → Tournament Home with new card visible in the
  collection strip.

### 7.4. Loss

- Minimal: "Defeated." Opponent name. "Retry" (primary) or "Back to
  Tournament Home."
- Optional: MVP / biggest-hit from existing match-stats system
  (`packages/shared/src/stats.ts`) — nice-to-have, not required.

---

## 8. Acceptance Criteria

A reviewer should be able to verify:

1. New "Tournament" button on menu in both web and mobile.
2. Starting a fresh tournament shows 8 opponents, only #1 clickable.
3. Deck builder opened from pre-match only lists cards in the starter pool.
4. Beating opponent #1 advances `currentRound`, unlocks a card (visible in
   collection), and makes #2 clickable. Deck builder now lists that card.
5. Losing returns to pre-match/home with no progression change.
6. Reloading the page / app restores exact tournament state.
7. Each AI preset feels distinctly different in a side-by-side playthrough
   (easy sometimes passes turns; expert presses hard into the Lord).
8. Clearing opponent #8 shows a champion screen, unlocks the final card,
   and enables "Replay Tournament".
9. "Reset Tournament" (confirmed) wipes unlocks and progress back to
   initial state.
10. No regressions: Quick Start, VS Computer, Local 2P, and Online modes
    work identically to before.
11. Unit tests cover: persistence round-trip, AI preset configs load, deck
    + reward + pool validation, reducer transitions (win/loss/replay/reset).

---

## 9. Open Questions / Assumptions

Items the implementing agents may decide without blocking, with default
assumption noted:

- **Q:** Can the player change their deck mid-match? **A:** No. Only
  between matches.
- **Q:** Do unlocked cards appear in the *regular* (non-tournament) deck
  builder? **A:** Yes — unlocks persist across all modes. The non-tournament
  deck builder shows them too. (This incentivizes climbing.)
- **Q:** Is there a soft cap on tournament-deck size beyond the normal
  deck-builder minimum? **A:** No, use existing rules.
- **Q:** Should opponent order be randomized? **A:** No. Fixed order so
  difficulty ramp is controlled.
- **Q:** Opponent portraits/art? **A:** Reuse an existing card's art or use
  a placeholder icon per archetype. Custom art is out of scope.
- **Q:** Any balance passes baked into this doc? **A:** No. Initial balance
  is the content agent's best guess; follow-up tuning is a separate effort.

---

## 10. Work Breakdown — Agent Assignments

Five agents can proceed largely in parallel with the dependency graph
below. Types (§5.1) should be merged first, or at least drafted in a shared
branch, because most agents import them.

```
  [A: Content]  ─┐
                  ├─► [D: Client UI]
  [B: Persist]  ─┤
                  ├─► [E: Mobile UI]
  [C: AI]       ─┘
```

### Agent A — Content & Data
**Scope:** `packages/shared/src/tournament/`
- Author the 8 `TournamentOpponent` entries (names, archetypes, blurbs,
  decks, difficulty, reward IDs).
- Author the starter pool list.
- Write a validation test (§5.3).
- Pick concrete card IDs from existing catalog.

**Deliverable:** opponents.ts, starterPool.ts, index.ts, tests.

### Agent B — Persistence & State
**Scope:** types + storage libs + store slices.
- `packages/shared/src/tournament/types.ts`.
- `packages/client/src/lib/tournament.ts` (localStorage).
- `packages/mobile/src/lib/tournament.ts` (AsyncStorage).
- Tournament store slice for both client and mobile
  (`startOpponent`, `completeMatch`, `editDeck`, `replayTournament`,
  `resetTournament`).
- Unit tests for persistence round-trip + reducer transitions.

**Deliverable:** types, two storage libs, two store slices, tests.

### Agent C — AI Difficulty Presets
**Scope:** `packages/battle-engine/src/ai/`.
- Define `AIConfig` and export `AI_PRESETS`.
- Thread config through `executeAITurn`.
- Implement top-K randomized selection and aggression weight.
- Implement depth-2 lookahead (bounded, expert-only).
- Unit tests: each preset runs on canned state; easy sometimes passes,
  expert prefers Lord-damage lines.

**Deliverable:** presets.ts, updated aiPlayer.ts + evaluate.ts, lookahead.ts,
tests.

### Agent D — Web Client UI
**Scope:** `packages/client/src/`.
- Add "Tournament" menu entry.
- TournamentHome, PreMatch, Reward, Loss pages.
- Wire deck-builder `poolFilter` prop.
- Wire battle entry to pass AI preset through to engine.
- Integration test: full happy-path click-through for one opponent
  (stub the engine to auto-win).

**Depends on:** A, B, C.

### Agent E — Mobile UI
**Scope:** `packages/mobile/src/`.
- Mirror of Agent D on React Native.
- Same screens as native components.
- Wire deck-builder pool filter.

**Depends on:** A, B, C.

---

## 11. Out of Scope (explicit)

- Online/multiplayer tournaments.
- Cloud save / cross-device sync.
- Multiple save slots.
- Story, portraits, cutscenes, voice.
- Daily challenges, leaderboards, ranking.
- New cards, new card types, new board mechanics.
- Balance patches to existing cards.
- Analytics/telemetry for the tournament.

These are all reasonable future extensions but must not be added in the
initial implementation.
