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

/** Validate an auth payload. Returns error message or null. */
export function validateAuth(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return "Missing auth payload";
  const p = payload as { playerId?: unknown; displayName?: unknown };
  if (typeof p.playerId !== "string" || p.playerId.length < 8 || p.playerId.length > 64) {
    return "Invalid playerId";
  }
  if (typeof p.displayName !== "string" || p.displayName.length === 0 || p.displayName.length > 20) {
    return "Display name must be 1-20 characters";
  }
  return null;
}
