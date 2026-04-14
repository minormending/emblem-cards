import type { FieldPosition } from '@cards/shared';

export interface GameActions {
  deploy(handIndex: number, target?: FieldPosition): void;
  attack(from: FieldPosition, to: FieldPosition): void;
  endTurn(): void;
}
