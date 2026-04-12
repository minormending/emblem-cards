# Emblem Cards

A multiplayer tactical card game inspired by Fire Emblem, built as a TypeScript monorepo. Players build decks of units, weapons, items, support pairs, and tactics, then deploy them onto a 3x2 battlefield grid. The game supports both local hot-seat play (two players on one screen) and online play through a real-time server.

---

## New developer? Start here

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Package layout, data flow diagrams, and key invariants.
- **[docs/MAKING_CHANGES.md](./docs/MAKING_CHANGES.md)** — Step-by-step recipes for common tasks (add a card, tweak balance, add an effect, debug issues).

This README is the long-form reference. The docs above are quicker for day-to-day work.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack Explained](#2-tech-stack-explained)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [How the Game Works](#5-how-the-game-works)
6. [Architecture Deep Dive](#6-architecture-deep-dive)
7. [TypeScript for JS Developers](#7-typescript-for-js-developers)
8. [Common Tasks](#8-common-tasks)
9. [Testing](#9-testing)
10. [Troubleshooting](#10-troubleshooting)
11. [Glossary](#11-glossary)

---

## 1. Project Overview

Emblem Cards is a two-player card battle game. Think of it like a simplified Fire Emblem game, but instead of moving units on a large grid map, you play cards from your hand onto a small 3x2 battlefield.

Here is what a player does in a typical game:

1. **Build a deck** of 15 cards. The deck must include exactly one Lord unit (your commander). You can include up to 2 copies of any non-Lord card.
2. **Start a battle** — Quick Start (random decks vs AI), VS Computer (build a deck, fight the AI), Local 2P (hot-seat), or Online (matched with another player).
3. **Each turn**, you draw a card, spend energy to deploy units onto field slots, equip weapons, play items or tactics, and order your units to attack enemy units.
4. **Win** by knocking out the enemy Lord, routing the enemy (no units on the field + none in hand or deck), or forcing a deck-out.

The project is split into five packages inside a monorepo:

- `shared` -- type definitions and network protocol shared by everything
- `card-engine` -- card data, damage formulas, and the weapon/magic triangle
- `battle-engine` -- the full game state machine (deploy, attack, end turn, win conditions)
- `server` -- a Socket.IO server for online matchmaking and game rooms
- `client` -- a React web app where players actually see and play the game

---

## 2. Tech Stack Explained

If you only know vanilla JavaScript, every tool below will be new. This section explains each one in plain English.

### TypeScript

**What it is:** TypeScript is JavaScript with type annotations added on top. You write `.ts` files instead of `.js` files. Before running, a compiler strips out the type annotations and produces plain JavaScript.

**Why we use it:** In a card game, data shapes matter enormously. A `UnitCard` must have `hp`, `str`, `def`, and so on. TypeScript catches mistakes like misspelling `unit.stts.hp` at compile time instead of at runtime. Without it, you would discover bugs only by playing the game and hitting weird behavior.

**The one sentence:** TypeScript is JavaScript where you declare what shape your data has, and the compiler yells at you if you get it wrong.

### React

**What it is:** React is a library for building user interfaces out of small, reusable pieces called "components." Instead of manually updating the DOM with `document.getElementById` and `.innerHTML`, you describe what the screen should look like for a given piece of data, and React figures out what to change.

**Why we use it:** The game UI has a hand of cards, a 3x2 field grid, energy bars, turn banners, and a deck builder. React lets us write each of those as a self-contained component (like `CardView`, `FieldSlotView`, `HandView`) and compose them together. When game state changes (a unit takes damage, a card is played), React automatically re-renders only the parts of the screen that changed.

**The one sentence:** React lets you write UI as functions that take data in and return HTML-like markup, and it keeps the screen in sync with your data automatically.

### Vite

**What it is:** Vite is a build tool and development server for web apps. When you run `pnpm dev` in the client package, Vite starts a local server (usually at `http://localhost:5173`) that serves your React app. It also watches your files and refreshes the browser instantly when you save a change.

**Why we use it:** Vite is extremely fast because it uses native ES modules during development (it does not bundle everything into one file until you build for production). Older tools like Webpack are slower to start and slower to update.

**The one sentence:** Vite is the thing that runs your React app locally and rebuilds it instantly when you change code.

### Tailwind CSS v4

**What it is:** Tailwind CSS is a utility-first CSS framework. Instead of writing CSS rules in a separate file, you apply small utility classes directly in your HTML/JSX. For example, `className="text-sm font-bold text-red-400"` makes text small, bold, and red. You never write a `.card-title { font-size: 14px; }` rule -- you compose from tiny building blocks.

**Why we use it:** Card games have lots of visual elements (cards, field slots, stat bars, badges). Tailwind lets us style everything inline without managing a growing CSS file. Version 4 has a Vite plugin that removes any unused classes automatically, so the final CSS is tiny.

**The one sentence:** Tailwind CSS replaces traditional CSS files with short class names like `bg-red-500` and `px-4` that you apply directly to elements.

### Zustand

**What it is:** Zustand (German for "state") is a tiny state management library for React. It creates a "store" -- a single JavaScript object that holds all your app's data and functions to modify that data. Any React component can read from the store and will re-render when the data it cares about changes.

**Why we use it:** The game has a lot of shared state: the current screen (menu, deck builder, battle), the game state, selected cards, online connection info. Zustand is simpler than Redux (another popular option) and has almost no boilerplate. You create a store with `create()`, put your state and actions inside, and use `useGameStore()` in components to read it.

**The one sentence:** Zustand is a single shared object that holds all your app's data, and React components automatically update when the parts they read from change.

### Socket.IO

**What it is:** Socket.IO is a library for real-time, bidirectional communication between a web browser and a server. Unlike normal HTTP requests (where the browser asks and the server responds), Socket.IO keeps a persistent connection open so the server can push updates to the browser at any time.

**Why we use it:** In online mode, when your opponent plays a card, the server needs to immediately tell your browser about it. You cannot poll the server every second asking "did anything change?" -- that would be slow and wasteful. Socket.IO lets the server push game updates the instant they happen.

**The one sentence:** Socket.IO is a two-way pipe between browser and server that stays open so either side can send messages at any time.

### pnpm

**What it is:** pnpm is a package manager, like npm or yarn. You use it to install dependencies (other people's code your project needs). The command `pnpm install` reads every `package.json` in the project and downloads everything.

**Why we use it:** pnpm is faster than npm and uses less disk space because it shares packages across projects. More importantly, pnpm has first-class support for **workspaces** (monorepos with multiple packages). When one package says it depends on `@cards/shared`, pnpm links to the local folder instead of trying to download it from the internet.

**The one sentence:** pnpm installs your dependencies and links the local packages in this monorepo together so they can import from each other.

### Turborepo

**What it is:** Turborepo is a build system for monorepos. When you run `pnpm build`, Turborepo figures out the correct order to build all five packages (shared first, then card-engine, then battle-engine, etc.) and caches the results so it does not rebuild packages that have not changed.

**Why we use it:** Without Turborepo, you would have to manually `cd` into each package and run `build` in the right order. Turborepo reads the dependency graph from each `package.json` and does it all with one command: `pnpm build`.

**The one sentence:** Turborepo runs build/test/dev across all packages in the right order and skips packages that have not changed.

---

## 3. Project Structure

The full directory tree. Every significant file has a short explanation.

```
cards/
  package.json              -- Root monorepo scripts (build, test, dev)
  pnpm-workspace.yaml       -- Declares packages/* as workspace packages
  turbo.json                -- Turborepo task config (build, test, dev order)
  docs/
    ARCHITECTURE.md         -- Package layout, data-flow diagrams, invariants
    MAKING_CHANGES.md       -- Step-by-step recipes for common tasks

  packages/
    shared/                 -- Types + constants, no runtime deps
      src/
        types.ts            -- Card, UnitCard, Field, Player, GameState, Effect
        protocol.ts         -- Socket.IO event signatures
        constants.ts        -- Game balance numbers (DECK_SIZE, MAX_ENERGY, ...)
        errors.ts           -- ErrorCode enum, Result<T>, ok/err/isErr helpers
        events.ts           -- GameEvent discriminated union + formatEvent()
        clone.ts            -- cloneCard() deep clone

    card-engine/            -- Card data + pure per-card functions
      src/
        triangles.ts        -- Weapon & magic triangle lookups
        damage.ts           -- calculateDamage() — STR/MAG vs DEF/RES formula
        cards/
          index.ts          -- Aggregates all arrays, runs validation
          validate.ts       -- Fail-fast invariant checks at module load
          units.ts          -- All unit cards (Marth, Karel, Hawkeye, ...)
          weapons.ts        -- All weapons (Iron Sword, Javelin, Excalibur, ...)
          items.ts          -- All items (Vulnerary, Pure Water, Energy Ring)
          supports.ts       -- All supports (Bond of Arms, Wing Sisters, ...)
          tactics.ts        -- All tactics (Rally, Bolting, Convoy, Rescue)

    battle-engine/          -- Game state machine, returns GameEvent[]
      src/
        players.ts          -- currentPlayer / opposingPlayer lookups
        field.ts            -- Field primitives (placeUnit, canReach, canEquip)
        game.ts             -- Turn flow (createGame, drawPhase, attackAction, endTurn)
        deploy.ts           -- deployCard with per-card-type handlers
        effects.ts          -- resolveEffects() for items/tactics
        win.ts              -- checkWinCondition()
        ai/
          evaluate.ts       -- AI scoring with reasoning breakdowns
          aiPlayer.ts       -- executeAITurn() — runs AI turn to completion
        __tests__/
          helpers.ts         -- Shared factories (makeUnit, buildDeck, value, errCode)
          game.test.ts       -- Game creation, draw phase, turn flow
          deploy.test.ts     -- Deploying each card type + target validation
          combat.test.ts     -- Attack, range, KO → win
          effects.test.ts    -- Healing caps, buff caps
          weapons.test.ts    -- Weapon compatibility, re-equip discard
          supports.test.ts   -- Support dedup
          win.test.ts        -- checkWinCondition in isolation
          mutation-safety.test.ts  -- Card-template isolation guarantees
          events.test.ts     -- Event-stream assertions

    server/                 -- Socket.IO server for online play
      src/
        index.ts            -- Socket handlers, matchmaking orchestration
        GameRoom.ts         -- Wraps a GameState, enforces turn ownership
        matchmaking.ts      -- FIFO pair-up queue
        sessions.ts         -- playerId ↔ socketId session tracking
        validate.ts         -- Deck/position/input sanitization
        logger.ts           -- Structured logger (info/warn/error with tags)

    client/                 -- React web app
      src/
        main.tsx            -- React mount point
        App.tsx             -- Screen router based on gameStore.screen
        store/
          gameStore.ts      -- Zustand store — state + lifecycle
          selectors.ts      -- Mode-agnostic getters (currentPlayer, opponent, isMyTurn)
          actions/
            types.ts        -- GameActions interface
            local.ts        -- Local/AI implementation (runs engine, sfx, log)
            online.ts       -- Online implementation (emits socket events)
          aiTurn.ts         -- scheduleAITurn() — runs AI opponent's turn
          logStore.ts       -- Battle log (maps GameEvents to entries)
          socket.ts         -- Singleton socket.io client
          socketListeners.ts-- Server → client event handlers
        pages/
          Menu.tsx          -- Main menu: Quick Start, VS Computer, Local 2P, Online
          DeckBuilder.tsx   -- Browse cards, build deck
          Matchmaking.tsx   -- "Finding opponent..." screen
          Battle.tsx        -- Battle screen orchestrator
        components/
          battle/
            EnergyBar.tsx   -- Amber-dot energy indicator with flash animation
            TurnBanner.tsx  -- "Your Turn" pill in the top bar
            ActionHint.tsx  -- Contextual "click to deploy/attack" banner
            Toast.tsx       -- Bottom-right message bubble
            FieldGrid.tsx   -- 3×2 slot grid with highlight logic
            WinnerScreen.tsx-- Final victory/defeat screen
            TurnTransitionOverlay.tsx -- Hot-seat "X's turn" overlay
          CardView.tsx      -- Renders any card at any size
          FieldSlotView.tsx -- One field slot (empty or occupied)
          HandView.tsx      -- Horizontal scrollable hand
          CardInspector.tsx -- Full-size card modal (right-click or click-when-disabled)
          GameLog.tsx       -- Sidebar battle log
          HowToPlay.tsx     -- 5-page tutorial modal
          BattleHints.tsx   -- First-game contextual hints
          CardArt.tsx       -- Inline SVG card art
        hooks/
          useBattleSlotHandlers.ts -- Click logic for field slots
          useWinSound.ts    -- Play victory/defeat sfx once on win
        lib/
          sounds.ts         -- Synth sfx via Web Audio API
          identity.ts       -- UUID-based anonymous identity in localStorage
          deckBuilder.ts    -- buildRandomDeck() helper
          colors.ts         -- Tailwind color map for card types
          effects.ts        -- effectLabel() for rendering
          firstTime.ts      -- First-visit flags for tutorial
```

### Package Dependencies

The packages depend on each other in a chain:

```
shared  <--  card-engine  <--  battle-engine  <--  server
                                                      |
shared  <--  card-engine  <--  battle-engine  <--  client
                                                      |
shared  <----------------------------------------------
```

- `shared` depends on nothing. Every other package depends on it.
- `card-engine` depends on `shared` (it needs the type definitions).
- `battle-engine` depends on `shared` and `card-engine` (it uses the damage formula and types).
- `server` depends on `shared`, `card-engine`, and `battle-engine` (it runs game logic server-side).
- `client` depends on `shared`, `card-engine`, and `battle-engine` (it runs game logic for local mode and renders cards).

In each `package.json`, these dependencies are listed with `"workspace:*"`, which tells pnpm to link to the local package folder rather than downloading from npm.

Lower packages know nothing about higher ones. `shared` owns the cross-cutting contracts — `Result<T>`/`ErrorCode` (in `errors.ts`) and `GameEvent` (in `events.ts`) — that every layer above flows through. Engines return `Result<GameEvent[]>`; server and client consume both.

---

## 4. Getting Started

### Prerequisites

You need these installed on your machine:

- **Node.js** version 18 or later. Check with `node --version`.
- **pnpm** version 9 or later. Install with `npm install -g pnpm`, then check with `pnpm --version`.

### Step 1: Clone the repository

```bash
git clone <repository-url> cards
cd cards
```

### Step 2: Install all dependencies

From the root of the project, run:

```bash
pnpm install
```

This installs dependencies for every package (shared, card-engine, battle-engine, server, client) in one command. It also links the workspace packages together.

### Step 3: Build everything

```bash
pnpm build
```

This runs `turbo build`, which compiles TypeScript in every package in the correct order. The compiled JavaScript goes into a `dist/` folder in each package.

You must build at least once before running dev mode, because packages like `card-engine` and `battle-engine` need their compiled output so other packages can import from them.

### Step 4: Run in development mode

Open two terminal tabs.

**Terminal 1 -- Server (for online mode):**

```bash
cd packages/server
pnpm dev
```

This starts the Socket.IO server on port 3001 using `tsx watch`, which auto-restarts when you change server code.

**Terminal 2 -- Client:**

```bash
cd packages/client
pnpm dev
```

This starts Vite on `http://localhost:5173`. Open that URL in your browser.

If you only want local mode (two players on one screen), you do not need the server running.

### Step 5: Run tests

```bash
pnpm test
```

This runs tests across all packages. Currently, `card-engine` and `battle-engine` have tests using Vitest.

### If Something Goes Wrong

- **"Cannot find module @cards/shared"** -- You probably skipped the build step. Run `pnpm build` from the project root.
- **Port 3001 already in use** -- Another process is using that port. Kill it with `lsof -ti:3001 | xargs kill` (on macOS/Linux), or change the port by setting `PORT=3002` before running the server.
- **pnpm not found** -- Install it globally: `npm install -g pnpm`.
- **Node version too old** -- This project needs Node 18+. Use `nvm install 18` if you use nvm.

---

## 5. How the Game Works

### Card Types

There are five types of cards in the game. Each has different properties and plays differently.

#### Unit Cards

Units are the characters you place on the battlefield. Each unit has stats, an attack type, tags, optional effects, a deployment cost, and a flag indicating whether it is a Lord.

Example -- Marth:

```
type: "unit"
id: "lord-marth"
name: "Marth"
class: "Lord"
attackType: "sword"
stats: { hp: 22, str: 9, mag: 0, def: 7, res: 4, spd: 10 }
tags: ["infantry"]
effects: []
cost: 3
isLord: true
```

Marth is a Lord (if he is KO'd, you lose). He uses a sword, has 22 HP, 9 STR for physical attack, 7 DEF against physical attacks, and costs 3 energy to deploy.

#### Weapon Cards

Weapons are equipped to units already on the field. They boost stats and can change the effective attack type.

Example -- Iron Sword:

```
type: "weapon"
id: "iron-sword"
name: "Iron Sword"
attackType: "sword"
statBoost: { str: 2 }
effects: []
cost: 1
```

This gives the equipped unit +2 STR. It costs 1 energy to play.

#### Item Cards

Items have immediate effects and are discarded after use. They do things like heal a unit or buff a stat temporarily.

Example -- Vulnerary:

```
type: "item"
id: "vulnerary"
name: "Vulnerary"
effects: [{ kind: "heal_target", amount: 10 }]
cost: 1
```

Play this on a friendly unit to heal it for 10 HP.

#### Support Cards

Support cards represent bonds between two specific unit classes. When you play a support card, it goes into your active support area and provides bonuses as long as both required classes are on your field.

Example -- Knight's Oath:

```
type: "support"
id: "support-knights-oath"
name: "Knight's Oath"
pairRequirement: { classA: "Cavalier", classB: "Cavalier" }
effects: [
  { kind: "pair_bonus", stat: "def", amount: 3 },
  { kind: "pair_bonus", stat: "str", amount: 2 }
]
cost: 2
```

If you have two Cavalier units on the field, this gives them +3 DEF and +2 STR.

#### Tactic Cards

Tactics are one-time-use strategic plays. They resolve immediately (deal damage, reposition units, draw cards) and then go to the discard pile.

Example -- Bolting:

```
type: "tactic"
id: "tactic-bolting"
name: "Bolting"
effects: [{ kind: "damage_target", amount: 8 }]
cost: 4
```

Deals 8 direct damage to any enemy unit. Expensive at 4 energy, but bypasses the normal damage formula.

### Stats

Every unit has six stats:

| Stat | Full Name | What It Does |
|------|-----------|-------------|
| HP   | Hit Points | How much damage a unit can take before being KO'd. When HP reaches 0, the unit is removed from the field and goes to the discard pile. |
| STR  | Strength | Used for physical attacks (sword, axe, lance, bow). Higher STR means more damage. |
| MAG  | Magic | Used for magical attacks (fire, wind, thunder). Higher MAG means more magical damage. A physical unit typically has 0 MAG. |
| DEF  | Defense | Reduces incoming physical damage. The formula subtracts DEF from the attacker's STR. |
| RES  | Resistance | Reduces incoming magical damage. The formula subtracts RES from the attacker's MAG. |
| SPD  | Speed | Currently tracked but not used in the damage formula. Reserved for future mechanics (dodge chance, attack priority). |

### The Damage Formula

The damage formula is the heart of combat. Here is how it works, step by step.

**Step 1: Determine if the attack is physical or magical.**

- Sword, axe, lance, and bow attacks are **physical**. They use STR vs DEF.
- Fire, wind, and thunder attacks are **magical**. They use MAG vs RES.

**Step 2: Calculate raw attack power.**

```
Physical: ATK = STR + weaponBoost + triangleBonus
Magical:  ATK = MAG + weaponBoost + triangleBonus
```

- `weaponBoost` is the stat bonus from an equipped weapon (e.g., Iron Sword gives +2 STR).
- `triangleBonus` is +2 if you have weapon/magic triangle advantage (see next section), or 0 otherwise.

**Step 3: Subtract defense.**

```
Physical: baseDamage = ATK - DEF    (minimum 1)
Magical:  baseDamage = ATK - RES    (minimum 1)
```

Damage can never go below 1. Even if the defender has higher defense than your attack, you always deal at least 1.

**Step 4: Apply tag multiplier.**

If the attacker has an effect like `damage_multiplier_vs_tag: { tag: "flying", multiplier: 3 }`, and the defender has the `flying` tag, the damage is multiplied.

```
damagePerHit = floor(baseDamage * tagMultiplier)
```

**Step 5: Check for double attack.**

If the attacker has the `double_attack` effect (like Swordmasters), they hit twice.

```
totalDamage = damagePerHit * hits    (hits is 1 or 2)
```

#### Worked Example 1: Basic Physical Attack

Ogma (STR 10, sword) attacks a generic unit (DEF 5). No weapon, no triangle.

```
ATK = 10 + 0 + 0 = 10
baseDamage = 10 - 5 = 5
tagMultiplier = 1 (no special effect)
damagePerHit = floor(5 * 1) = 5
hits = 1
totalDamage = 5
```

#### Worked Example 2: Triangle + Weapon

Ogma (STR 10, sword) with Iron Sword (+2 STR) attacks an axe user (DEF 6). Sword beats axe, so triangle bonus is +2.

```
ATK = 10 + 2 + 2 = 14
baseDamage = 14 - 6 = 8
tagMultiplier = 1
damagePerHit = 8
hits = 1
totalDamage = 8
```

#### Worked Example 3: Archer vs. Flying Unit

An archer (STR 10, bow, has `3x vs flying` effect) attacks a Pegasus Knight (DEF 5, tags: ["flying"]).

```
ATK = 10 + 0 + 0 = 10       (bow has no triangle)
baseDamage = 10 - 5 = 5
tagMultiplier = 3             (3x vs flying)
damagePerHit = floor(5 * 3) = 15
hits = 1
totalDamage = 15
```

#### Worked Example 4: Magical Attack

A mage (MAG 14, fire) attacks a unit (RES 4). Fire vs. wind defender would get triangle bonus, but this defender uses a sword, so no triangle.

```
ATK = 14 + 0 + 0 = 14
baseDamage = 14 - 4 = 10
tagMultiplier = 1
damagePerHit = 10
hits = 1
totalDamage = 10
```

### Weapon Triangle and Magic Triangle

The weapon triangle determines which weapon types have advantage over others. Having advantage gives +2 to your attack stat for that combat.

**Weapon Triangle (physical):**

```
Sword  beats  Axe
Axe    beats  Lance
Lance  beats  Sword
```

Think of it as a rock-paper-scissors cycle: Sword > Axe > Lance > Sword.

**Magic Triangle:**

```
Fire     beats  Wind
Wind     beats  Thunder
Thunder  beats  Fire
```

Same cycle: Fire > Wind > Thunder > Fire.

**Cross-type:** There is no triangle interaction between physical and magical types. Sword vs Fire gets no bonus. Bow is outside both triangles entirely and never gets or gives a triangle bonus.

**Important:** There is no penalty for disadvantage. If your lance attacks a sword user, you simply get +0 instead of +2. You do not lose attack power.

### Field Layout

The battlefield is a **3 columns by 2 rows** grid. Each player has their own grid.

```
         Col 0     Col 1     Col 2
Back   [ slot ]   [ slot ]   [ slot ]
Front  [ slot ]   [ slot ]   [ slot ]
```

- **Front row:** Your frontline fighters. They can be attacked by any enemy unit.
- **Back row:** Protected units. They can only be attacked if:
  - The front slot in the same column is empty (the back unit is "exposed").
  - The attacker has the **ranged** effect (archers, bow users).
  - The attacker has the **flying** effect.

Each slot can hold one unit and one weapon. When you deploy a unit, you choose which slot it goes into. When you equip a weapon, you target a slot that already has a unit.

### Turn Flow

Each turn follows these steps:

1. **Draw Phase:** You automatically draw 1 card from your deck. If your deck is empty, this may trigger a loss condition.

2. **Deploy Phase:** You can spend energy to play cards from your hand:
   - Deploy a unit card to an empty field slot.
   - Equip a weapon card to a slot that has a unit.
   - Play a support card (goes to your active support area).
   - Play an item or tactic card (resolves immediately, then discarded).
   - You can deploy multiple cards in one turn, as long as you have enough energy.

3. **Action Phase:** You select one of your units and choose an enemy unit to attack. The damage formula runs, and the enemy unit takes damage. If its HP drops to 0, it is KO'd and moves to the discard pile.

4. **End Turn:** Press the "End Turn" button. This triggers:
   - End-of-turn effects (like `heal_adjacent` -- units with this effect heal nearby allies).
   - A check for win conditions.
   - The current player swaps.
   - The new player's max energy increases by 1 (capped at 8) and their energy refills to the new max.

### Energy System

Energy is the resource you spend to play cards. Each card has a cost (shown in the top-right corner).

- Both players start with **1 energy** and **1 max energy**.
- At the start of each of your turns, your max energy increases by 1 (up to a maximum of **8**).
- Your energy refills to your max at the start of your turn.

This means:
- Turn 1: 1 energy (play a 1-cost card).
- Turn 2: 2 energy (play a 2-cost card, or two 1-cost cards).
- Turn 3: 3 energy.
- ...and so on, up to 8 energy per turn.

Expensive cards (cost 4, 5, 6) are powerful but can only be played in later turns.

### Win Conditions

The game ends when either of these happens:

1. **Lord KO:** If a player's Lord unit is KO'd (sent to the discard pile), that player loses. This is the most common way to win. Protect your Lord.

2. **Rout:** If a player has zero units on the field AND zero unit cards in their hand and deck, that player loses. They have been completely wiped out.

In online mode, disconnecting also counts as a forfeit -- the remaining player wins.

### Effects System

Effects are special abilities baked into cards. The engine checks for them during combat and at end of turn. Here is every effect type in the game:

| Effect Kind | What It Does | Example Card |
|---|---|---|
| `damage_multiplier_vs_tag` | Multiplies damage against units with a specific tag. | Sniper: 3x vs flying |
| `double_attack` | The unit attacks twice in one action. | Swordmaster: attacks twice |
| `stat_modifier` | Permanently modifies a stat on the unit. | Berserker: +5 STR |
| `heal_adjacent` | At end of turn, heals all adjacent friendly units. | Troubadour: heal adjacent 5 HP |
| `heal_target` | Heals a target unit (used by item cards). | Vulnerary: heal 10 HP |
| `buff_target` | Temporarily buffs a stat for a number of turns. | Rally: +4 STR for 1 turn |
| `damage_target` | Deals direct damage to an enemy unit. | Bolting: deal 8 damage |
| `reposition` | Moves a unit from one field position to another. | Rescue: move unit to back row |
| `draw_cards` | Draw extra cards from your deck. | (draw 2 extra cards) |
| `ranged` | Can attack back-row enemies even if front-row is occupied. | Archer |
| `flying` | Can attack back-row enemies; vulnerable to anti-flying. | Pegasus Knight |
| `pair_bonus` | Grants a stat bonus when both required classes are on field. | Knight's Oath: +3 DEF to pair |

---

## 6. Architecture Deep Dive

### Why Pure Functions?

The `card-engine` and `battle-engine` packages are written as **pure functions**. A pure function takes inputs and returns outputs without touching any global state, network, or UI.

For example, `calculateDamage(attacker, weapon, defender, defenderWeapon)` takes four arguments and returns a `DamageResult` object. It does not know or care whether it is being called from a browser, a server, or a test. This is important because:

1. **Both the client and server use the same code.** In local mode, the client calls `attackAction()` directly. In online mode, the server calls the same `attackAction()` on the server side. Same function, same results, no duplication.
2. **Testing is easy.** You can test `calculateDamage` by passing in fake card objects and checking the output. No need to simulate a browser or network.
3. **No hidden state.** Every function takes a `GameState` object and mutates it directly. There is no hidden global variable that could get out of sync.

### Result<T> — typed errors everywhere

Engine actions never throw for expected failures (not enough energy, invalid target, wrong class for a weapon). They return a `Result<T>`:

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: GameError };

const r = deployCard(state, handIndex, target);
if (isErr(r)) {
  showMessage(formatError(r.error));  // human-readable
  return;
}
const events = r.value;
```

Every error has a stable `code` (e.g., `ErrorCode.TOME_ON_WARRIOR`) so programmatic code can branch on it. Human-readable messages come from `DEFAULT_ERROR_MESSAGES` in `packages/shared/src/errors.ts`. No `new Error("...")` in engine or server action paths.

### GameEvents — observable mutations

Every mutating engine function returns `Result<GameEvent[]>`. Each event is a discriminated-union variant describing one discrete thing that happened:

```typescript
{ kind: "unit_deployed", position, unit }
{ kind: "unit_damaged", position, amount, hpAfter, source }
{ kind: "unit_ko", position, unit }
{ kind: "game_won", winner, reason: "lord_ko" }
// ...15 variants total, see packages/shared/src/events.ts
```

Consumers never diff state to figure out what changed — they walk the event list:

```typescript
const events = value(attackAction(state, from, to));
if (events.some(e => e.kind === "unit_ko")) sfx.ko();
useLogStore.addFromEvents(state, events);  // auto-formats to log entries
```

Tests assert on events rather than state — it's easier to read and more robust to refactors. See `packages/battle-engine/src/__tests__/events.test.ts`.

### Mode-Agnostic Actions

The client exposes a single `GameActions` interface (`deploy`, `attack`, `endTurn`), and `store.getActions()` returns the right implementation based on `mode`. Battle components never branch on mode — they just call `actions.deploy(...)`.

```typescript
interface GameActions {
  deploy(handIndex: number, target?: FieldPosition): void;
  attack(from: FieldPosition, to: FieldPosition): void;
  endTurn(): void;
}
```

- `createLocalActions(store)` runs the engine in-process (used for Local 2P and VS Computer)
- `createOnlineActions(store)` emits socket events (used for Online mode)

### Local Mode Data Flow

In local mode (two players, one screen), no server is involved. Here is how a player action flows through the code:

```
User clicks a field slot to deploy a card
  --> useBattleSlotHandlers.handleOwnSlotClick()
    --> store.getActions().deploy(handIndex, position)
      --> (local.ts) deployCard(state, handIndex, target) from battle-engine
        --> deployCard validates energy, dispatches to the per-card handler,
            mutates the GameState, and returns Result<GameEvent[]>
      --> on success:
          - sfx.deploy() plays the deploy sound
          - useLogStore.addFromEvents(events) writes human-readable log lines
          - store.setState({ gameState: { ...state } })
      --> React re-renders the battle screen with the updated state
```

The key insight: the Zustand store holds a `GameState` object. When an action modifies it, we spread it into a new object (`{ ...gameState }`) so Zustand detects the change and triggers a re-render. The returned `GameEvent[]` drives sfx and the battle log — we never diff state to figure out what happened.

### Online Mode Data Flow

In online mode, every action goes through the server. The client does not run game logic locally -- it only sends requests and receives view snapshots.

```
User clicks a field slot to deploy a card
  --> useBattleSlotHandlers.handleOwnSlotClick()
    --> store.getActions().deploy(handIndex, position)
      --> (online.ts) socket.emit("game:deploy", handIndex, position)
        --- network --->
        server/index.ts receives "game:deploy"
          --> requireGameContext(socket) looks up session + room
          --> validatePosition(position) sanitizes input
          --> GameRoom.deploy(playerId, handIndex, target)
            --> enforces turn ownership, calls deployCard(...) from battle-engine
            --> returns Result<GameEvent[]>
          --> on success, broadcastGameUpdate(room) sends each player
              their own GameView (opponent hand/deck reduced to counts)
        <--- network ---
      socketListeners receive "game:update"
        --> store.setState({ gameView: view })
      --> React re-renders
```

### How GameView Sanitizes Data

In online mode, the server cannot send the full `GameState` to both players, because that would reveal each player's hand and deck to the opponent. Instead, the `GameRoom.getView(playerId)` method builds a `GameView` for each player:

```typescript
{
  you: Player,          // Full data: your hand, deck, field, energy
  opponent: {
    id: string,
    name: string,
    field: Field,        // You can see their units on the field
    handCount: number,   // You can see HOW MANY cards they have, but not WHAT
    deckCount: number,   // Same for deck
    discardPile: Card[], // Discard is public information
    energy: number,
    maxEnergy: number,
  },
  isYourTurn: boolean,
  turnNumber: number,
  winner: string | null,
}
```

The opponent's `hand` and `deck` arrays are replaced with just counts. This prevents cheating.

### How the AI Works

The AI opponent (Quick Start, VS Computer) is **pure TypeScript — no API calls, no LLM, no paid service**. It runs in-process in the browser with zero latency and zero cost. All the logic lives in `packages/battle-engine/src/ai/`.

**Algorithm: one-ply greedy scoring.**

On each AI turn, [`executeAITurn()`](packages/battle-engine/src/ai/aiPlayer.ts) loops up to `AI_MAX_ACTIONS_PER_TURN` times:

1. **Enumerate every legal action** — every deploy (card × position) and every attack (attacker × target). See `scoreDeploys` and `scoreAttacks` in [evaluate.ts](packages/battle-engine/src/ai/evaluate.ts).
2. **Score each one** by summing a list of `ScoreContribution`s — labelled deltas like `"KO target" (+20)`, `"deal 8 damage" (+8)`, `"melee to front row" (+5)`.
3. **Pick the highest-scoring action** and execute it via the same `deployCard` / `attackAction` paths a human player uses. Repeat.
4. Stop when no action scores above `SCORING.MIN_ACTION_SCORE` (the AI "ends its turn" when nothing is worth doing).

The returned `{ actions, events }` flows back through the normal pipeline — same sfx, same battle log, same win-condition checks as a human turn.

**Scoring weights** all live in one `SCORING` constant at the top of [evaluate.ts](packages/battle-engine/src/ai/evaluate.ts). A few highlights:

| Constant | Value | Meaning |
|---|---|---|
| `LORD_KO_BONUS` | 50 | Killing the enemy Lord wins — dominates everything |
| `KO_BONUS` | 20 | Any KO is valuable |
| `DRAW_BONUS` | 12 | Drawing cards |
| `RIGHT_ROW_BONUS` | 5 | Melee to front, ranged/healers to back |
| `WRONG_ROW_PENALTY` | -3 | Melee in back (exposed) |
| `STAT_WEIGHT` | 0.5 | Per point of STR + MAG |

Change a number, rebuild, the AI plays differently. No other code needs to change.

**Explainability.** Every action carries its full reasoning breakdown. `explainAction(action)` renders it as a debug string:

```
"KO enemy Lord (win!) (+50) + KO target (+20) + deal 8 damage (+8) = 78"
```

In local/AI mode, the client logs these to the browser devtools console prefixed with `[AI]` — if the AI plays a surprising move, open devtools and read the reasoning to find which factor dominated.

**Limitations (intentional).**

- **One-ply only** — doesn't simulate opponent responses. Won't avoid deploying a juicy unit into a known counter.
- **Greedy per action** — picks the locally-best move each step, not the best sequence for the whole turn.
- **Heuristic, not optimal** — tuned by feel. Crank `LORD_KO_BONUS` too high and it will lunge for the Lord even when suicidal.

If you wanted stronger play, the natural next step is shallow minimax (2-3 plies) reusing the same scoring function — still free, just more CPU.

---

## 7. TypeScript for JS Developers

This section teaches you just enough TypeScript to read the codebase. You do not need to become a TypeScript expert -- you just need to not be confused by the syntax.

### Type Annotations

In plain JavaScript, you write:

```javascript
let name = "Marth";
let hp = 22;
```

In TypeScript, you can (optionally) add type annotations after a colon:

```typescript
let name: string = "Marth";
let hp: number = 22;
```

This tells the compiler: "`name` must always be a string, and `hp` must always be a number." If you later write `hp = "hello"`, TypeScript will show an error.

Function parameters and return types use the same syntax:

```typescript
function greet(name: string): string {
  return "Hello, " + name;
}
```

The `: string` after the parameter list is the return type. This function takes a string and returns a string.

### Interfaces

An interface defines the shape of an object. Think of it as a blueprint.

In JavaScript, you might write:

```javascript
const card = { name: "Marth", hp: 22, str: 9 };
```

In TypeScript, you first define the shape:

```typescript
interface Stats {
  hp: number;
  str: number;
  mag: number;
  def: number;
  res: number;
  spd: number;
}
```

Then any object declared as type `Stats` must have all those fields with the right types:

```typescript
const marth: Stats = { hp: 22, str: 9, mag: 0, def: 7, res: 4, spd: 10 };
```

If you forget a field or misspell one, TypeScript shows an error. Interfaces do not exist at runtime -- they are erased during compilation. They are purely for catching mistakes while you code.

### Union Types

A union type means "this value can be one of several things." The syntax uses a pipe (`|`):

```typescript
type WeaponType = "sword" | "axe" | "lance";
```

A variable of type `WeaponType` can only be the string `"sword"`, `"axe"`, or `"lance"`. Nothing else.

```typescript
let weapon: WeaponType = "sword";  // OK
let weapon: WeaponType = "gun";    // ERROR: "gun" is not allowed
```

This project uses union types extensively. For example, `AttackType` is:

```typescript
type AttackType = WeaponType | MagicType | RangedType;
// which expands to: "sword" | "axe" | "lance" | "fire" | "wind" | "thunder" | "bow"
```

And `Card` is a union of all five card interfaces:

```typescript
type Card = UnitCard | WeaponCard | ItemCard | SupportCard | TacticCard;
```

This means a `Card` could be any one of those five. You check which one it is by looking at the `type` field:

```typescript
if (card.type === "unit") {
  // TypeScript now knows card is a UnitCard, so card.stats is available
  console.log(card.stats.hp);
}
```

### Generics

Generics are like parameters for types. You have seen `Array<number>` -- that means "an array where every element is a number."

In this codebase, you will see things like:

```typescript
const cardIndex = new Map<string, Card>(...)
```

`Map<string, Card>` means "a Map where keys are strings and values are Cards." Without generics, you would have to remember what types the map holds. With generics, the compiler knows and helps you.

Another example from the server:

```typescript
const rooms = new Map<string, GameRoom>();
```

This is a Map where each key is a room ID (string) and each value is a `GameRoom` object.

You do not need to write generics yourself to work on this project. You just need to read them. When you see `Something<X, Y>`, think "Something that works with X and Y."

### `type` vs `interface`

Both `type` and `interface` can define the shape of an object. In this codebase:

- `interface` is used for object shapes (like `Stats`, `UnitCard`, `Player`, `GameState`).
- `type` is used for unions and aliases (like `AttackType = "sword" | "axe" | "lance"`).

For practical purposes, they are interchangeable when defining object shapes. The codebase just follows the convention of using `interface` for "thing with properties" and `type` for "one of several possible values."

### Import Type

You will see this syntax:

```typescript
import type { Card, UnitCard } from "@cards/shared";
```

The `type` keyword after `import` means "I am only importing this for type checking, not for runtime use." During compilation, this import is erased completely. It produces no JavaScript code.

Why does this matter? It tells the bundler "you do not need to actually load this module at runtime." This can prevent circular dependency issues and makes builds slightly faster.

If you are unsure, just read `import type { X }` as "import X for type-checking only."

### Reading types.ts

The file `packages/shared/src/types.ts` is the single source of truth for all data shapes in the game. Here is how to read it:

1. Start at the top with the simple unions (`WeaponType`, `MagicType`, etc.). These define the allowed string values.
2. Then read `Stats` -- the six numbers every unit has.
3. Then read `Effect` -- this is a big union of all possible effects. Each one has a `kind` field that identifies it, plus additional data fields specific to that effect.
4. Then read the five card interfaces (`UnitCard`, `WeaponCard`, `ItemCard`, `SupportCard`, `TacticCard`). Notice they all have `type`, `id`, `name`, `cost`, and `effects`, but each has unique fields too.
5. Then read `Field`, `FieldSlot`, `FieldPosition` -- these define the 3x2 grid.
6. Finally, `Player` and `GameState` tie it all together: a game has two players, each with a deck, hand, field, and energy.

---

## 8. Common Tasks

### Adding a New Unit Card

1. Open `packages/card-engine/src/cards/units.ts`.

2. Add a new object to the `units` array. Follow the pattern of existing units:

```typescript
{
  type: "unit",
  id: "cavalier-seth",          // Unique ID, lowercase with hyphens
  name: "Seth",                  // Display name
  class: "Cavalier",             // Class name (used by support cards)
  attackType: "lance",           // One of: "sword", "axe", "lance", "bow", "fire", "wind", "thunder"
  maxHp: 24,                     // Original HP value (used for HP bar display)
  stats: { hp: 24, str: 11, mag: 0, def: 8, res: 4, spd: 9 },
  tags: ["mounted"],             // One or more of: "infantry", "mounted", "armored", "flying"
  effects: [],                   // Add effects here if the unit has special abilities
  cost: 3,                       // Energy cost to deploy
  isLord: false,                 // true if this is a Lord card
  flavor: "The Silver Knight.",   // Optional flavor text
},
```

**Important:** `maxHp` must match the `hp` value in `stats`. The `stats.hp` changes during battle as the unit takes damage, but `maxHp` stays constant so the UI can draw an accurate HP bar.

3. Run `pnpm build` from the project root to recompile.

4. The new unit will automatically appear in the deck builder because `allCards` in `cards/index.ts` aggregates all unit, weapon, item, support, and tactic arrays.

### Adding a New Effect Type

Effects are a discriminated union. Adding one touches the type, the engine site that resolves it, the client label, and a test. For a step-by-step recipe see [docs/MAKING_CHANGES.md](./docs/MAKING_CHANGES.md#add-a-new-effect-type). Short version:

1. Declare the variant in `packages/shared/src/types.ts` (the `Effect` union):

```typescript
| { kind: "pierce_defense"; percentage: number }
```

2. Handle it at the right site. Depending on when the effect fires:

| When | File |
|------|------|
| Damage calc | `packages/card-engine/src/damage.ts` |
| On deploy (unit) | `packages/battle-engine/src/deploy.ts` (`deployUnit`) |
| From an item/tactic | `packages/battle-engine/src/effects.ts` (`resolveEffects`) |
| End of turn | `packages/battle-engine/src/game.ts` (`applyUnitHealAuras` / `applySupportHeals`) |
| Passive reach (e.g. `ranged`) | `packages/battle-engine/src/game.ts` (`attackAction`) |

**If the effect mutates state, emit a `GameEvent` for it.** That is how the battle log, sfx, and tests observe what happened — never by diffing state.

3. Add a case in `effectLabel()` inside `packages/client/src/lib/effects.ts` so cards render it.

4. Add a test in the appropriate `__tests__/*.test.ts` file (usually `events.test.ts` when the effect emits a new event kind).

5. Run `pnpm build` and `pnpm test`.

### Adding a New Card Type

This is a bigger change. Suppose you want a "Trap" card type.

1. Open `packages/shared/src/types.ts`:
   - Define a new interface `TrapCard` with all its fields.
   - Add `TrapCard` to the `Card` union: `type Card = UnitCard | WeaponCard | ... | TrapCard;`

2. Create `packages/card-engine/src/cards/traps.ts`:
   - Define an array of `TrapCard` objects.
   - Export it.

3. Open `packages/card-engine/src/cards/index.ts`:
   - Import `traps` from `./traps.js`.
   - Add `...traps` to the `allCards` array.
   - Export `traps`.

4. Open `packages/card-engine/src/index.ts`:
   - Add `traps` to the export list.

5. Open `packages/battle-engine/src/deploy.ts`:
   - Add a new `deployTrap` handler that returns `Result<{ events: GameEvent[]; selfManaged: boolean }>`.
   - Dispatch to it from the top-level `deployCard` based on `card.type === "trap"`.
   - Emit a matching `GameEvent` (add the variant to `packages/shared/src/events.ts`) so the battle log and tests can observe the play.

6. Open `packages/client/src/components/CardView.tsx`:
   - Add rendering logic for the new card type: `{card.type === "trap" && <TrapCardBody card={card} />}`
   - Create a `TrapCardBody` component.

7. Open `packages/client/src/pages/DeckBuilder.tsx`:
   - Add a new tab for Traps in the `tabs` array.

8. Run `pnpm build` and test in the browser.

### Changing the Damage Formula

The damage formula lives in one file: `packages/card-engine/src/damage.ts`, in the `calculateDamage` function.

The current formula is:

```
Physical: baseDamage = (STR + weaponBoost + triangleBonus) - DEF   (min 1)
Magical:  baseDamage = (MAG + weaponBoost + triangleBonus) - RES   (min 1)
```

To change it, edit the relevant lines in `calculateDamage`. For example, to make the minimum damage 0 instead of 1:

```typescript
// Change this line:
const baseDamage = Math.max(1, atk - def);
// To this:
const baseDamage = Math.max(0, atk - def);
```

After changing the formula, update the tests in `packages/card-engine/src/__tests__/damage.test.ts` to match the new expected values. Run `pnpm test` to verify.

### Adding a New Page/Screen

1. Create a new file in `packages/client/src/pages/`, for example `Settings.tsx`:

```typescript
import { useGameStore } from "../store/gameStore";

export function Settings() {
  const { setScreen } = useGameStore();

  return (
    <div>
      <h1>Settings</h1>
      <button onClick={() => setScreen("menu")}>Back</button>
    </div>
  );
}
```

2. Open `packages/client/src/store/gameStore.ts`. Add `"settings"` to the `Screen` type:

```typescript
type Screen = "menu" | "deck-builder" | "matchmaking" | "battle" | "settings";
```

3. Open `packages/client/src/App.tsx`. Import your new page and add a case:

```typescript
import { Settings } from "./pages/Settings";

// Inside the switch:
case "settings":
  return <Settings />;
```

4. Add a button somewhere (like `Menu.tsx`) that calls `setScreen("settings")`.

### Modifying the Field Grid Size

The field is currently 3 columns by 2 rows. To change this:

1. Open `packages/shared/src/types.ts`:
   - Change `FieldCol` to allow more values. Currently it is `type FieldCol = 0 | 1 | 2;`. For 4 columns, make it `type FieldCol = 0 | 1 | 2 | 3;`.
   - Change the `Field` type. Currently: `type Field = Record<FieldRow, [FieldSlot, FieldSlot, FieldSlot]>;`. For 4 columns: `Record<FieldRow, [FieldSlot, FieldSlot, FieldSlot, FieldSlot]>;`.
   - If you want more rows, add to `FieldRow` (e.g., `"front" | "middle" | "back"`).

2. Open `packages/battle-engine/src/field.ts`:
   - Update `createEmptyField()` to create the right number of slots.
   - Update `getOccupiedPositions()` and `getAdjacentPositions()` -- they loop over `[0, 1, 2]` which needs to match the new column count.
   - Update `canReach()` if row logic changes.

3. Open `packages/client/src/pages/Battle.tsx`:
   - Update the `COLS` constant to match: `const COLS: FieldCol[] = [0, 1, 2, 3];`

4. Rebuild and test thoroughly.

### Adding a New Socket Event

Suppose you want to add a chat message feature.

1. Open `packages/shared/src/protocol.ts`. Add the new event to the appropriate interface:

```typescript
// Client sends:
export interface ClientToServerEvents {
  // ... existing events
  "chat:send": (message: string) => void;
}

// Server sends:
export interface ServerToClientEvents {
  // ... existing events
  "chat:message": (data: { from: string; text: string }) => void;
}
```

2. Open `packages/server/src/index.ts`. Add a handler for the new event inside `io.on("connection", (socket) => { ... })`. Always start with `requireGameContext(socket)` (or `requireAuthOrError(socket)` for non-room events) and validate the payload before doing anything:

```typescript
socket.on("chat:send", (message) => {
  const ctx = requireGameContext(socket);
  if (!ctx) return;
  if (typeof message !== "string" || message.length > 200) {
    return socket.emit("game:error", "Invalid message");
  }
  io.to(ctx.room.id).emit("chat:message", { from: ctx.playerId, text: message });
});
```

3. Open `packages/client/src/store/socketListeners.ts`. Register a listener for the new server event:

```typescript
socket.on("chat:message", ({ from, text }) => {
  // Handle the message in the store
});
```

4. Add Zustand state for chat messages and emit the client event when the user types. If it is a game action (not just chat), add it to `GameActions` in `packages/client/src/store/actions/types.ts` and implement it in both `local.ts` and `online.ts` — that way battle components remain mode-agnostic.

5. Build and test.

---

## 9. Testing

### How to Run Tests

From the project root:

```bash
pnpm test
```

This runs Turborepo's `test` task, which executes tests in every package that has a `test` script. Currently:

- `@cards/card-engine` -- uses Vitest, runs tests in `src/__tests__/`.
- `@cards/battle-engine` -- uses Vitest, runs tests in `src/__tests__/`.
- `@cards/shared` -- has `echo "no tests yet"` (no tests written yet).
- `@cards/server` and `@cards/client` -- no test scripts configured yet.

To run tests for one package only:

```bash
cd packages/card-engine
pnpm test
```

To run tests in watch mode (re-runs on file changes):

```bash
cd packages/card-engine
npx vitest
```

### How Tests Are Structured

Tests use **Vitest**, which has the same API as Jest (a popular testing framework). Each test file lives in a `__tests__/` folder next to the code it tests.

A test file looks like this:

```typescript
import { describe, it, expect } from "vitest";
import { getTriangleBonus } from "../triangles.js";

describe("getTriangleBonus", () => {
  it("sword beats axe", () => {
    expect(getTriangleBonus("sword", "axe")).toBe(2);
  });

  it("no bonus for same weapon", () => {
    expect(getTriangleBonus("sword", "sword")).toBe(0);
  });
});
```

- `describe("name", () => { ... })` groups related tests together.
- `it("description", () => { ... })` defines a single test case.
- `expect(value).toBe(expected)` asserts that `value` equals `expected`.

### How to Add a New Test

1. Find the `__tests__/` folder in the package you want to test (or create one).

2. Create a new file named `yourFeature.test.ts`.

3. Import `describe`, `it`, and `expect` from `vitest`.

4. Import the function(s) you want to test.

5. Write test cases. A good pattern is to create helper functions (like `makeUnit`) that build test data with sensible defaults, then override only the fields you care about.

Example for a new test:

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../myModule.js";

describe("myFunction", () => {
  it("does the expected thing", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });

  it("handles edge case", () => {
    const result = myFunction("");
    expect(result).toBeNull();
  });
});
```

6. Run `pnpm test` from the package directory to verify.

### Asserting on Events, Not State

Engine actions return `Result<GameEvent[]>`. Tests should assert on the **events emitted** rather than diffing state — events describe what the engine says happened, and they are what the client renders in the log. Shared test helpers live in `packages/battle-engine/src/__tests__/helpers.ts`:

```typescript
import { value, errCode, buildDeck, makeUnit } from "./helpers.js";

const events = value(attackAction(state, from, to));
expect(findEvent(events, "unit_ko")).toBeDefined();
```

Where `findEvent` narrows the union by `kind`:

```typescript
function findEvent<K extends GameEvent["kind"]>(events: GameEvent[], kind: K) {
  return events.find(e => e.kind === kind) as Extract<GameEvent, { kind: K }> | undefined;
}
```

For failing actions, use `errCode(result)` to assert on the typed error code instead of the message string.

### Existing Test Coverage

**`card-engine/__tests__/`:**
- `triangles.test.ts` — weapon/magic triangle lookups, bow outside both triangles.
- `damage.test.ts` — STR-DEF, MAG-RES, minimum damage, triangle bonus, weapon boost, double attack, damage multipliers.

**`battle-engine/__tests__/`:**
- `game.test.ts` — game creation, draw phase, turn flow (energy growth, cap at 8).
- `deploy.test.ts` — deploying each card type + target validation errors.
- `combat.test.ts` — attack resolution, front/back targeting, range rules, KO → win.
- `effects.test.ts` — healing caps, HP buff caps.
- `weapons.test.ts` — class/weapon compatibility (Tome on Warrior, Bow = ranged Warrior), re-equip discard.
- `supports.test.ts` — support dedup and pair activation.
- `win.test.ts` — `checkWinCondition()` in isolation (Lord KO, rout).
- `mutation-safety.test.ts` — card-template isolation (deep clone on deploy).
- `events.test.ts` — asserting on emitted `GameEvent`s (unit_deployed, unit_damaged, unit_ko, game_won, cards_drawn, unit_healed, turn_ended, energy_changed, item_played).

---

## 10. Troubleshooting

### "Cannot find module @cards/shared" (or @cards/card-engine, @cards/battle-engine)

**Cause:** The workspace packages have not been compiled yet. When you import from `@cards/shared`, it resolves to `packages/shared/dist/index.js`. If the `dist/` folder does not exist, the import fails.

**Fix:**

```bash
pnpm build
```

Run this from the project root. It compiles every package in the correct order. After building, the `dist/` folders will be created and imports will work.

### "composite: true" Errors

**Cause:** TypeScript project references require `"composite": true` in `tsconfig.json`. If you see errors mentioning this, a `tsconfig.json` somewhere is missing that setting.

**Fix:** Open the `tsconfig.json` in the package that is failing and make sure it has:

```json
{
  "compilerOptions": {
    "composite": true,
    ...
  }
}
```

### Port Already in Use (EADDRINUSE)

**Cause:** Something else is already running on port 3001 (the default server port).

**Fix (macOS/Linux):**

```bash
# Find what is using the port
lsof -i :3001

# Kill it
lsof -ti:3001 | xargs kill
```

**Alternative:** Change the port by setting an environment variable before starting the server:

```bash
PORT=3002 pnpm dev
```

Then update the client's server URL in `packages/client/src/store/socket.ts`:

```typescript
const SERVER_URL = "http://localhost:3002";
```

### pnpm Workspace Issues

**Symptom:** "ERR_PNPM_WORKSPACE_PKG_NOT_FOUND" or packages not linking correctly.

**Fix:**

1. Make sure `pnpm-workspace.yaml` exists in the project root with this content:

```yaml
packages:
  - "packages/*"
```

2. Delete `node_modules` in every package and the root, then reinstall:

```bash
rm -rf node_modules packages/*/node_modules
pnpm install
```

3. Make sure each package's `name` field in `package.json` matches what other packages reference. For example, `@cards/shared` must be the exact name, not `cards-shared` or `shared`.

### Socket Connection Failures

**Symptom:** Online mode shows "Connecting..." forever or you see WebSocket errors in the browser console.

**Possible causes and fixes:**

1. **Server is not running.** Start it:
   ```bash
   cd packages/server
   pnpm dev
   ```
   You should see `[server] listening on :3001` in the terminal.

2. **CORS error.** The server only allows connections from `http://localhost:5173`, `http://localhost:5174`, and `http://localhost:5175`. If Vite chose a different port, add that port to the `cors.origin` array in `packages/server/src/index.ts`.

3. **Wrong server URL.** The client connects to `http://localhost:3001` (defined in `packages/client/src/store/socket.ts`). If your server is on a different port or host, update `SERVER_URL`.

4. **Firewall blocking.** On some systems, the OS firewall may block local socket connections. Allow Node.js in your firewall settings.

### Build Errors After Changing Types

**Symptom:** After you change a type in `shared`, other packages fail to build.

**Fix:** You need to rebuild in order. Turborepo normally handles this, but if something is stuck:

```bash
# Clean all dist folders
rm -rf packages/*/dist

# Rebuild everything from scratch
pnpm build
```

### "The server responded with status 404" on Vite Dev

**Cause:** Vite cannot find a module. This usually means a workspace dependency has not been built.

**Fix:** Run `pnpm build` from the project root, then restart `pnpm dev` in the client package.

---

## 11. Glossary

### Game Terms

**Backline / Back Row:** The second row of the 3x2 field grid. Units here are protected from melee attacks unless the front slot in their column is empty, or the attacker is ranged/flying.

**Cost:** The amount of energy required to play a card from your hand.

**Deck:** The pile of cards you built before the game. You draw from it each turn.

**Deploy:** The act of playing a card from your hand onto the field or into the active area.

**Discard Pile:** Where cards go when they are used up (items, tactics) or when units are KO'd.

**Energy:** The resource you spend each turn to play cards. Starts at 1, increases by 1 each turn, caps at 8.

**Effect:** A special ability on a card that modifies gameplay (bonus damage, healing, double attacks, etc.).

**Field:** Your side of the battlefield -- a 3x2 grid of slots where you place units.

**Field Slot:** One cell in the field grid. Can hold one unit and one weapon.

**Flying:** A tag/effect that allows a unit to attack back-row enemies and makes it vulnerable to anti-flying effects.

**Frontline / Front Row:** The first row of the 3x2 field grid. Units here are exposed to all attacks.

**Hand:** The cards you are currently holding. You draw into your hand and play from your hand.

**KO (Knock Out):** When a unit's HP reaches 0. The unit is removed from the field and sent to the discard pile.

**Lord:** A special unit type. Every deck must have exactly one. If your Lord is KO'd, you lose the game.

**Magic Triangle:** Fire > Wind > Thunder > Fire. Gives +2 ATK when you have advantage.

**Max Energy:** The maximum energy you can have. Increases by 1 each turn, caps at 8.

**Pair Bonus:** A stat boost from a Support card when both required unit classes are on the field.

**Ranged:** A tag/effect that allows a unit to attack back-row enemies even when the front row is occupied.

**Rout:** A win condition where the opponent has zero units on the field, in hand, and in deck.

**Tags:** Labels on units like "infantry", "mounted", "armored", "flying" that other effects can target (e.g., "3x damage vs flying").

**Turn:** One player's complete sequence of draw, deploy, attack, and end turn.

**Weapon Triangle:** Sword > Axe > Lance > Sword. Gives +2 ATK when you have advantage.

### Tech Terms

**Component:** In React, a function that returns UI markup (JSX). Components can be composed together. For example, `Battle` is a component that contains `FieldGrid`, `HandView`, and `EnergyBar` components.

**Emit:** In Socket.IO, sending a message. `socket.emit("game:attack", from, to)` sends a "game:attack" event with data to the server.

**Hook:** In React, a function that starts with `use` (like `useState`, `useCallback`, `useGameStore`). Hooks let components "hook into" React features like state and side effects.

**Interface:** In TypeScript, a description of an object's shape. It lists what fields the object must have and what types those fields are.

**JSX/TSX:** A syntax extension that lets you write HTML-like markup inside JavaScript/TypeScript files. `<div className="red">Hello</div>` is JSX. The `.tsx` file extension means "TypeScript with JSX."

**Monorepo:** A single repository that contains multiple packages/projects. This project has five packages (shared, card-engine, battle-engine, server, client) all in one repo.

**Mutation:** Directly modifying an object's properties. For example, `unit.stats.hp -= 5` is a mutation. The battle-engine functions mutate the `GameState` object directly rather than creating new copies.

**Package:** In this project, one of the five folders inside `packages/`. Each package has its own `package.json`, its own source code, and can depend on other packages.

**Props:** Short for "properties." In React, props are the data you pass to a component. `<CardView card={myCard} onClick={handler} />` passes `card` and `onClick` as props.

**Pure Function:** A function that always returns the same output for the same input and has no side effects (no network calls, no DOM manipulation). The card-engine and battle-engine are made of pure functions.

**Re-render:** When React detects that a component's data has changed, it calls the component function again to produce updated UI. This happens automatically.

**Socket:** A persistent two-way connection between client and server, managed by Socket.IO.

**State:** Data that can change over time and causes the UI to update. In this project, state is managed by Zustand (client-side) and by `GameState` objects (engine-side).

**Store:** In Zustand, the central object that holds all application state and the functions to modify it. Created with `create()` and accessed with `useGameStore()`.

**Type Union:** In TypeScript, a type that can be one of several things, written with pipes: `"sword" | "axe" | "lance"`.

**Workspace:** In pnpm, a way to manage multiple packages in one repository. The `pnpm-workspace.yaml` file defines which folders are workspace packages. Dependencies between them use `"workspace:*"` syntax.
