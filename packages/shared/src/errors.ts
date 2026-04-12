/**
 * Central catalog of every error the game engine can produce.
 *
 * We use string-literal codes (not strings) so errors can be:
 *   - Compared programmatically (switch on e.code, not e.message)
 *   - Translated to different messages per locale/context in the UI
 *   - Logged consistently across server and client
 *
 * When adding a new error path:
 *   1. Add a code here.
 *   2. Add its default message to DEFAULT_MESSAGES below.
 *   3. Return `error(Code, "optional extra context")` from the action.
 *
 * NEVER throw strings or `new Error("...")` from the engine — return a
 * GameError so the caller can handle it programmatically.
 */
export const ErrorCode = {
  // Deploy
  NOT_ENOUGH_ENERGY: "not_enough_energy",
  INVALID_HAND_INDEX: "invalid_hand_index",
  MISSING_TARGET: "missing_target",
  SLOT_OCCUPIED: "slot_occupied",
  NO_UNIT_AT_TARGET: "no_unit_at_target",
  NO_ENEMY_AT_TARGET: "no_enemy_at_target",

  // Weapons
  WEAPON_TYPE_MISMATCH: "weapon_type_mismatch",
  WEAPON_ON_MAGE: "weapon_on_mage",
  TOME_ON_WARRIOR: "tome_on_warrior",

  // Combat
  NO_ATTACKER: "no_attacker",
  NO_DEFENDER: "no_defender",
  UNIT_ALREADY_ACTED: "unit_already_acted",
  CANNOT_REACH: "cannot_reach",

  // Turn / session
  NOT_YOUR_TURN: "not_your_turn",
  NOT_IN_GAME: "not_in_game",
  NOT_AUTHENTICATED: "not_authenticated",

  // Support
  SUPPORT_ALREADY_ACTIVE: "support_already_active",

  // Input validation (server)
  INVALID_DECK: "invalid_deck",
  INVALID_POSITION: "invalid_position",
  INVALID_AUTH: "invalid_auth",
} as const;

export type ErrorCodeValue = typeof ErrorCode[keyof typeof ErrorCode];

/** Default human-readable message for each error code. UIs may override. */
export const DEFAULT_ERROR_MESSAGES: Record<ErrorCodeValue, string> = {
  not_enough_energy: "Not enough energy",
  invalid_hand_index: "That card isn't in your hand",
  missing_target: "This card needs a target",
  slot_occupied: "That slot already has a unit",
  no_unit_at_target: "No unit at that position",
  no_enemy_at_target: "No enemy at that position",

  weapon_type_mismatch: "This weapon doesn't match the unit's type",
  weapon_on_mage: "Physical weapons cannot be equipped by mages",
  tome_on_warrior: "Magic tomes can only be equipped by mages",

  no_attacker: "No attacker at that position",
  no_defender: "No defender at that position",
  unit_already_acted: "This unit already acted this turn",
  cannot_reach: "Cannot reach that target",

  not_your_turn: "It's not your turn",
  not_in_game: "Not in a game",
  not_authenticated: "Not authenticated",

  support_already_active: "That support is already active",

  invalid_deck: "Invalid deck",
  invalid_position: "Invalid field position",
  invalid_auth: "Invalid authentication",
};

export interface GameError {
  code: ErrorCodeValue;
  /** Optional extra detail appended to the default message. */
  detail?: string;
}

/** Build a GameError. Caller may add context via the second arg. */
export function gameError(code: ErrorCodeValue, detail?: string): GameError {
  return detail ? { code, detail } : { code };
}

/** Render a GameError as a single human-readable string. */
export function formatError(err: GameError): string {
  const base = DEFAULT_ERROR_MESSAGES[err.code];
  return err.detail ? `${base} — ${err.detail}` : base;
}

/**
 * Standard result type for actions that can fail.
 *
 *   const result = deployCard(...);
 *   if (isErr(result)) {
 *     console.log(formatError(result.error));
 *     return;
 *   }
 *   // use result.value (narrowed to the Ok branch)
 */
export interface Ok<T> {
  ok: true;
  value: T;
}
export interface Err {
  ok: false;
  error: GameError;
}
export type Result<T = void> = Ok<T> | Err;

/** Type guard — narrows to the failure branch of a Result. */
export function isErr<T>(r: Result<T>): r is Err {
  return r.ok === false;
}

/** Type guard — narrows to the success branch of a Result. */
export function isOk<T>(r: Result<T>): r is Ok<T> {
  return r.ok === true;
}

export function ok(): Ok<void>;
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T | void> {
  return { ok: true, value: value as T };
}

export function err(code: ErrorCodeValue, detail?: string): Err {
  return { ok: false, error: gameError(code, detail) };
}
