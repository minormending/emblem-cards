/**
 * @cards/shared
 *
 * Types and constants shared between the client, server, and game engines.
 * NO runtime dependencies beyond TypeScript itself. Keep it that way.
 *
 * File map:
 *   - types.ts     : Card, Unit, Player, Field, GameState, Effect (the big ones)
 *   - protocol.ts  : Socket.IO event typings (ClientToServerEvents etc.)
 *   - constants.ts : Game balance numbers (DECK_SIZE, MAX_ENERGY, etc.)
 *   - clone.ts     : cloneCard() deep-clone helper
 */

export * from "./types.js";
export * from "./protocol.js";
export * from "./clone.js";
export * from "./constants.js";
export * from "./errors.js";
export * from "./events.js";
export * from "./stats.js";
export * from "./effects.js";
export * from "./labels.js";
export * from "./cardDisplay.js";
export * from "./cardGradients.js";
export * from "./cardIcons.js";
export * from "./tournament/index.js";
