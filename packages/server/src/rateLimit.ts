/**
 * Two-tier rate limiting.
 *
 * Per-socket bucket: short window (1s / 30 events). Catches burst spam and
 * lets humans do rapid-fire UI clicks without tripping.
 *
 * Per-IP bucket: longer window (60s / 300 events). Catches the reconnect
 * bypass — a client that gets kicked on the socket bucket and reconnects
 * still drags the same IP budget with them. The threshold leaves headroom
 * for multiple legitimate players behind a shared NAT.
 *
 * Both are in-memory Maps. Socket buckets are released on disconnect; IP
 * buckets self-expire when their window rolls over, and a sweep runs on a
 * low-frequency timer to discard long-idle entries so a DoS can't grow the
 * Map unboundedly.
 */

const SOCKET_WINDOW_MS = 1_000;
const SOCKET_MAX_EVENTS = 30;

const IP_WINDOW_MS = 60_000;
const IP_MAX_EVENTS = 300;

const IP_SWEEP_INTERVAL_MS = 5 * 60_000;

interface Bucket {
  windowStart: number;
  count: number;
}

const socketBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

function bump(map: Map<string, Bucket>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    map.set(key, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count++;
  return bucket.count <= max;
}

/** Returns true if this event should be processed. Enforces both buckets. */
export function allow(socketId: string, ip: string | null): boolean {
  if (!bump(socketBuckets, socketId, SOCKET_WINDOW_MS, SOCKET_MAX_EVENTS)) return false;
  if (ip && !bump(ipBuckets, ip, IP_WINDOW_MS, IP_MAX_EVENTS)) return false;
  return true;
}

/** Drops the per-socket bucket. Called on disconnect. */
export function release(socketId: string): void {
  socketBuckets.delete(socketId);
}

/** Periodic sweep: drop IP buckets whose window has expired. Bounded memory. */
function sweepIpBuckets(): void {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets) {
    if (now - bucket.windowStart >= IP_WINDOW_MS) ipBuckets.delete(ip);
  }
}

// Unref so the timer doesn't keep the process alive in tests.
const sweepTimer = setInterval(sweepIpBuckets, IP_SWEEP_INTERVAL_MS);
sweepTimer.unref?.();
