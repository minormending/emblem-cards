/**
 * Per-socket rate limiter using a sliding counter.
 *
 * A turn-based game has a natural action ceiling of roughly 1/sec during
 * play. Anything meaningfully above that is either lag spike replay
 * (acceptable, short burst) or abuse (spam, auto-play bots, DoS). The limit
 * is set high enough that humans never hit it, low enough that a malicious
 * client can't saturate the event loop.
 *
 * Storage is in-memory Map keyed by socket id. Entries are removed on
 * disconnect via `release()`. No TTL sweep needed because the server owns
 * socket lifecycle.
 */

const WINDOW_MS = 1_000;
const MAX_EVENTS_PER_WINDOW = 30;

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

/** Returns true if this event should be processed, false if rate-limited. */
export function allow(socketId: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(socketId);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(socketId, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count++;
  return bucket.count <= MAX_EVENTS_PER_WINDOW;
}

/** Called on disconnect so buckets don't leak for long-running servers. */
export function release(socketId: string): void {
  buckets.delete(socketId);
}
