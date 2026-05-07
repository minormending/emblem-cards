// Tracks authenticated sessions by playerId (UUID from the client's localStorage).
//
// Auth is trust-on-assertion — no passwords, no verification. The playerId is
// just a stable identifier. Security against impersonation would require a
// keypair/signature scheme, which is overkill for a casual card game.

export interface Session {
  playerId: string;
  displayName: string;
  socketId: string;
}

export class SessionStore {
  /** playerId → Session */
  private byPlayer = new Map<string, Session>();
  /** socketId → playerId */
  private bySocket = new Map<string, string>();

  /**
   * Register or replace a session for a playerId. If the player already has a
   * session on another socket, returns the OLD socket id so the caller can
   * disconnect it (prevents two tabs from holding the same identity).
   */
  authenticate(socketId: string, playerId: string, displayName: string): { oldSocketId: string | null } {
    const existing = this.byPlayer.get(playerId);
    const oldSocketId = existing && existing.socketId !== socketId ? existing.socketId : null;

    if (oldSocketId) {
      this.bySocket.delete(oldSocketId);
    }

    this.byPlayer.set(playerId, { playerId, displayName, socketId });
    this.bySocket.set(socketId, playerId);
    return { oldSocketId };
  }

  getByPlayer(playerId: string): Session | undefined {
    return this.byPlayer.get(playerId);
  }

  getBySocket(socketId: string): Session | undefined {
    const playerId = this.bySocket.get(socketId);
    if (!playerId) return undefined;
    return this.byPlayer.get(playerId);
  }

  removeBySocket(socketId: string): Session | undefined {
    const playerId = this.bySocket.get(socketId);
    if (!playerId) return undefined;
    const session = this.byPlayer.get(playerId);
    this.bySocket.delete(socketId);
    // Only remove from byPlayer if this socket still owns it
    if (session && session.socketId === socketId) {
      this.byPlayer.delete(playerId);
    }
    return session;
  }
}

// Letters, numbers, space, underscore, dot, hyphen — enough for any natural
// script but excluding control chars, whitespace trickery (tabs/newlines), and
// punctuation commonly used for impersonation (e.g. zero-width joiners).
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} _.\-]{1,20}$/u;

// playerId is a UUID-shaped opaque string from the client's localStorage. We
// allow a broader alphabet than strict UUID to keep the door open for other
// schemes later, but forbid anything that could sneak into log lines or paths.
const PLAYER_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Validate an auth payload. Returns { error } or { ok, normalized } where
 * `displayName` has been NFC-normalized so equivalent unicode forms compare
 * consistently. Callers should use the normalized value going forward.
 */
export type AuthValidation =
  | { ok: true; playerId: string; displayName: string }
  | { ok: false; error: string };

export function validateAuth(payload: unknown): AuthValidation {
  if (!payload || typeof payload !== "object") return { ok: false, error: "Missing auth payload" };
  const p = payload as { playerId?: unknown; displayName?: unknown };

  if (typeof p.playerId !== "string" || !PLAYER_ID_PATTERN.test(p.playerId)) {
    return { ok: false, error: "Invalid playerId" };
  }
  if (typeof p.displayName !== "string") {
    return { ok: false, error: "Display name is required" };
  }

  // Normalize first so the regex sees a canonical form. Precomposed vs
  // decomposed unicode would otherwise flip the length and pattern match.
  const normalized = p.displayName.normalize("NFC");
  if (!DISPLAY_NAME_PATTERN.test(normalized)) {
    return {
      ok: false,
      error: "Display name must be 1-20 letters, numbers, spaces, or . _ -",
    };
  }

  return { ok: true, playerId: p.playerId, displayName: normalized };
}
