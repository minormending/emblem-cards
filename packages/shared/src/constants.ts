/**
 * Single source of truth for all game-balance numbers.
 *
 * When balancing the game, change values here rather than hunting through
 * individual files. Each constant has a short comment explaining what
 * gameplay lever it controls.
 */

// ── Deck construction ──

/** Number of cards in a deck. Must include exactly 1 Lord. */
export const DECK_SIZE = 15;

/** Max copies of any single card in a deck (Lords always max 1). */
export const MAX_CARD_COPIES = 2;

// ── Game flow ──

/** Number of cards each player draws at the start of the game. */
export const STARTING_HAND_SIZE = 4;

/** Max energy a player can have per turn. Energy caps here even as turns go on. */
export const MAX_ENERGY = 8;

/** Energy each player has on turn 1. Grows by +1 every subsequent turn. */
export const STARTING_ENERGY = 1;

// ── Combat ──

/** Damage bonus when the attacker has weapon/magic triangle advantage. */
export const TRIANGLE_BONUS = 2;

/** Every attack deals at least this much damage, even against high DEF. */
export const MIN_DAMAGE = 1;

// ── Matchmaking / AI ──

/** How many auto-actions the AI can take per turn (safety cap). */
export const AI_MAX_ACTIONS_PER_TURN = 20;

/** Delay (ms) before AI starts its turn. Lets the player see the transition. */
export const AI_TURN_DELAY_MS = 800;

/**
 * Delay (ms) between individual AI actions within a single turn. The AI picks
 * and executes one move at a time so the player can watch each deploy/attack
 * land on the board instead of seeing the whole turn resolve in one frame.
 */
export const AI_ACTION_DELAY_MS = 700;

// ── UI ──

/** Toast/error message display time. */
export const MESSAGE_DURATION_MS = 1500;
