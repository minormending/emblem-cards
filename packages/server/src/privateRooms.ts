import { randomInt } from "node:crypto";
import type { Card } from "@cards/shared";

/**
 * Private matchmaking via short share codes.
 *
 * Flow:
 *   1. P1 emits `room:create` → server stores deck, returns a 4-char code
 *   2. P1 shares the code with P2 out-of-band (text, Discord, etc.)
 *   3. P2 emits `room:join` with the code + their deck
 *   4. Server starts the match using the same GameRoom flow as public queue
 *
 * Rooms without a second player expire after ROOM_TTL_MS so codes don't leak.
 */

const ROOM_TTL_MS = 10 * 60 * 1000; // 10 min
// Omit 0/O/1/I/L to avoid confusion when reading codes aloud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

export interface PendingRoom {
  code: string;
  hostId: string;
  hostDeck: Card[];
  createdAt: number;
}

export class PrivateRoomStore {
  private byCode = new Map<string, PendingRoom>();
  private byHost = new Map<string, string>();

  create(hostId: string, hostDeck: Card[]): PendingRoom {
    // If this host already has a pending room, reuse it — prevents code spam
    // if a player taps "Play with Friend" repeatedly.
    const existing = this.byHost.get(hostId);
    if (existing) {
      const room = this.byCode.get(existing);
      if (room) {
        room.hostDeck = hostDeck;
        room.createdAt = Date.now();
        return room;
      }
      this.byHost.delete(hostId);
    }

    const code = this.generateUniqueCode();
    const room: PendingRoom = {
      code,
      hostId,
      hostDeck,
      createdAt: Date.now(),
    };
    this.byCode.set(code, room);
    this.byHost.set(hostId, code);
    return room;
  }

  /** Look up by code, normalizing case and ignoring whitespace. */
  find(rawCode: string): PendingRoom | null {
    const code = normalizeCode(rawCode);
    const room = this.byCode.get(code);
    if (!room) return null;
    if (Date.now() - room.createdAt > ROOM_TTL_MS) {
      this.remove(code);
      return null;
    }
    return room;
  }

  remove(code: string): PendingRoom | null {
    const room = this.byCode.get(code);
    if (!room) return null;
    this.byCode.delete(code);
    if (this.byHost.get(room.hostId) === code) {
      this.byHost.delete(room.hostId);
    }
    return room;
  }

  removeByHost(hostId: string): PendingRoom | null {
    const code = this.byHost.get(hostId);
    if (!code) return null;
    return this.remove(code);
  }

  /** Drop expired rooms. Called opportunistically, not on a timer. */
  sweep(): void {
    const now = Date.now();
    for (const [code, room] of this.byCode) {
      if (now - room.createdAt > ROOM_TTL_MS) this.remove(code);
    }
  }

  private generateUniqueCode(): string {
    // With a 31-char alphabet at length 4 → ~923k codes. Collisions rare even
    // at hundreds of concurrent rooms; retry on the off chance.
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = randomCode();
      if (!this.byCode.has(code)) return code;
    }
    throw new Error("Could not allocate unique room code");
  }
}

export function normalizeCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function isValidCodeFormat(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Crypto-grade code generation. Math.random() leaks PRNG state across calls
 * — a player who has guessed enough codes could narrow the next one to a
 * small window. randomInt() draws from /dev/urandom and is unbiased over
 * the [0, alphabet.length) range, so each character is independently
 * uniform. Codes still have ~20 bits of entropy at length 4; the rate
 * limiter (300 events/min/IP) and 10-min TTL bound the brute-force window.
 */
function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}
