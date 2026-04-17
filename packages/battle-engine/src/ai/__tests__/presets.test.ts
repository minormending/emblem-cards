/**
 * AI difficulty preset tests.
 *
 * Covers: every preset runs to completion, legacy default is unchanged,
 * seeded top-K sampling is deterministic, and aggression weight steers
 * target selection (hard prefers enemy Lord more than easy).
 */
import { describe, it, expect } from "vitest";
import type { GameState } from "@cards/shared";
import { AI_MAX_ACTIONS_PER_TURN } from "@cards/shared";
import { createGame } from "../../game.js";
import { placeUnit } from "../../field.js";
import { currentPlayer, opposingPlayer } from "../../players.js";
import { executeAITurn, makeRng } from "../aiPlayer.js";
import { AI_PRESETS } from "../presets.js";
import { scoreAllActions } from "../evaluate.js";
import { buildDeck, makeUnit } from "../../__tests__/helpers.js";

/**
 * Minimal board: AI player has two attacker units on front row that can
 * reach the opponent's front row. Opponent has a Lord and an ordinary unit
 * side-by-side so the AI can pick either target for roughly-equal damage.
 */
function makeAttackScenario(): GameState {
  const state = createGame(buildDeck("ai"), buildDeck("pl"), "ai", "pl");
  // Clear hands so the AI has no deploy options and must only attack.
  state.players[0].hand = [];
  state.players[1].hand = [];

  // Two identical attackers for the AI at front-0 and front-1.
  placeUnit(state.players[0].field, { row: "front", col: 0 }, makeUnit("atkA"), false);
  placeUnit(state.players[0].field, { row: "front", col: 1 }, makeUnit("atkB"), false);

  // Opponent Lord at front-0 and ordinary unit at front-1. Same stats so
  // raw damage numbers match — the only differentiator is the Lord tag.
  placeUnit(
    state.players[1].field,
    { row: "front", col: 0 },
    makeUnit("lord", { isLord: true }),
    false
  );
  placeUnit(
    state.players[1].field,
    { row: "front", col: 1 },
    makeUnit("grunt"),
    false
  );
  return state;
}

describe("AI_PRESETS", () => {
  it("exports a config for every AIDifficulty key", () => {
    expect(Object.keys(AI_PRESETS).sort()).toEqual(["easy", "expert", "hard", "medium"]);
    for (const p of Object.values(AI_PRESETS)) {
      expect(p.searchDepth === 1 || p.searchDepth === 2).toBe(true);
      expect(p.topK).toBeGreaterThanOrEqual(1);
    }
  });

  it("matches the plan's ordering: hard/expert are more aggressive than easy", () => {
    expect(AI_PRESETS.easy.aggressionWeight).toBeLessThan(
      AI_PRESETS.hard.aggressionWeight
    );
    expect(AI_PRESETS.easy.aggressionWeight).toBeLessThan(
      AI_PRESETS.expert.aggressionWeight
    );
    // Easy's threshold is stricter than hard's (easy passes more).
    expect(AI_PRESETS.easy.scoreThreshold).toBeGreaterThan(
      AI_PRESETS.hard.scoreThreshold
    );
  });
});

describe("executeAITurn with presets", () => {
  for (const key of ["easy", "medium", "hard", "expert"] as const) {
    it(`runs ${key} preset to completion without throwing`, () => {
      const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
      const rng = makeRng(42);
      const result = executeAITurn(state, AI_PRESETS[key], rng);

      expect(result.actions.length).toBeLessThanOrEqual(AI_MAX_ACTIONS_PER_TURN);
      expect(Array.isArray(result.events)).toBe(true);
    });
  }

  it("with no config matches legacy greedy behavior (first pick)", () => {
    // Legacy behavior: pickBestAction returns the single top-scored action
    // with score > 0. Under the default config the refactored executeAITurn
    // should pick that same action first. Anything else means the refactor
    // drifted from legacy behavior.
    //
    // Default starting energy (1) isn't enough to deploy a cost-2 unit; bump
    // energy so there's at least one actionable candidate to compare on.
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    state.players[0].energy = 5;
    const clone = JSON.parse(JSON.stringify(state)) as GameState;

    const all = scoreAllActions(clone);
    all.sort((a, b) => b.score - a.score);
    const legacyFirst = all[0];
    expect(legacyFirst).toBeDefined();
    expect(legacyFirst.score).toBeGreaterThan(0);

    const result = executeAITurn(state); // no config
    expect(result.actions.length).toBeGreaterThan(0);
    // Compare structural identity of the first picked action.
    const picked = result.actions[0];
    expect(picked.type).toBe(legacyFirst.type);
    expect(picked.score).toBe(legacyFirst.score);
  });

  it("topK > 1 with a seeded RNG is deterministic", () => {
    const stateA = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const stateB = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    // Same deck -> same shuffles? No — shuffle uses Math.random, so state A
    // and B diverge. Clone instead.
    const cloneOf = JSON.parse(JSON.stringify(stateA)) as GameState;
    void stateB;

    const r1 = executeAITurn(stateA, AI_PRESETS.easy, makeRng(12345));
    const r2 = executeAITurn(cloneOf, AI_PRESETS.easy, makeRng(12345));
    expect(r1.actions.length).toBe(r2.actions.length);
    expect(JSON.stringify(r1.actions)).toBe(JSON.stringify(r2.actions));
  });
});

describe("aggression weight steers target selection", () => {
  /**
   * Build the attack scenario, run one greedy pick under a given preset
   * (topK=1 so the choice is deterministic), and report whether the AI
   * chose to attack the enemy Lord.
   */
  function targetedLord(presetKey: "easy" | "hard"): boolean {
    // Force topK=1 for both so we isolate the aggression signal.
    const cfg = { ...AI_PRESETS[presetKey], topK: 1 };
    const state = makeAttackScenario();
    const result = executeAITurn(state, cfg, makeRng(1));
    const first = result.actions[0];
    if (!first || first.type !== "attack") return false;
    // Opponent Lord sits at front-col-0 in our scenario.
    return first.to.row === "front" && first.to.col === 0;
  }

  it("hard preset prefers the enemy Lord target", () => {
    expect(targetedLord("hard")).toBe(true);
  });

  it("hard preset's Lord preference is at least as strong as easy's", () => {
    // Run a batch — easy's topK=3 with random sampling may occasionally
    // hit the Lord too. Over many seeds, hard should hit the Lord >= easy.
    let easyHits = 0;
    let hardHits = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const easyState = makeAttackScenario();
      const hardState = makeAttackScenario();
      const easyResult = executeAITurn(
        easyState,
        AI_PRESETS.easy,
        makeRng(seed)
      );
      const hardResult = executeAITurn(
        hardState,
        AI_PRESETS.hard,
        makeRng(seed)
      );
      const easyFirst = easyResult.actions[0];
      const hardFirst = hardResult.actions[0];
      if (
        easyFirst?.type === "attack" &&
        easyFirst.to.row === "front" &&
        easyFirst.to.col === 0
      )
        easyHits++;
      if (
        hardFirst?.type === "attack" &&
        hardFirst.to.row === "front" &&
        hardFirst.to.col === 0
      )
        hardHits++;
    }
    expect(hardHits).toBeGreaterThanOrEqual(easyHits);
    // And hard must actually pick the Lord reliably — near-always.
    expect(hardHits).toBeGreaterThanOrEqual(18);
  });

  it("sanity: both players are still on the board after the scenario runs", () => {
    const state = makeAttackScenario();
    executeAITurn(state, AI_PRESETS.medium, makeRng(7));
    // Current player was the AI (index 0). After its turn we can still
    // inspect both sides.
    expect(currentPlayer(state).id).toBe("ai");
    expect(opposingPlayer(state).id).toBe("pl");
  });
});
