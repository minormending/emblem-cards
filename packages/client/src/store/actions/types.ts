import type { FieldPosition } from "@cards/shared";

/**
 * The actions a player can take during a battle.
 *
 * Fire-and-forget: all three methods return void. Side effects (toasts, sfx,
 * log entries, state updates) happen inside the action itself — either
 * synchronously (local mode) or in response to server events (online mode).
 *
 * This interface is the single mode-agnostic surface the UI talks to. Battle
 * components call `actions.deploy(...)` without caring whether they're in
 * local, AI, or online mode.
 */
export interface GameActions {
  deploy(handIndex: number, target?: FieldPosition): void;
  attack(from: FieldPosition, to: FieldPosition): void;
  endTurn(): void;
}
