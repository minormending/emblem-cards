import type { Card } from "@cards/shared";

export interface QueueEntry {
  /** Stable playerId (UUID) — not the ephemeral socket.id */
  socketId: string; // name kept for backwards compat; holds playerId
  deck: Card[];
  joinedAt: number;
}

export class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  add(playerId: string, deck: Card[]): number {
    this.remove(playerId);
    this.queue.push({ socketId: playerId, deck, joinedAt: Date.now() });
    return this.queue.length;
  }

  remove(playerId: string): void {
    this.queue = this.queue.filter((e) => e.socketId !== playerId);
  }

  tryMatch(): [QueueEntry, QueueEntry] | null {
    if (this.queue.length < 2) return null;
    const p1 = this.queue.shift()!;
    const p2 = this.queue.shift()!;
    return [p1, p2];
  }

  getPosition(playerId: string): number {
    const idx = this.queue.findIndex((e) => e.socketId === playerId);
    return idx + 1;
  }

  get size(): number {
    return this.queue.length;
  }
}
