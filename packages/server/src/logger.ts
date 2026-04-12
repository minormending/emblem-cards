/**
 * Tiny structured logger for the server.
 *
 * All server output goes through `log()`. This gives us:
 *   - Consistent format (timestamp + level + tag + message + data)
 *   - One place to swap in a real logger (pino, winston, etc.) later
 *   - Easy-to-grep tags like [auth], [queue], [match], [room-3]
 *
 * Usage:
 *   log.info("auth", "player connected", { playerId });
 *   log.warn("queue", "rejected deck", { reason: err });
 *   log.error("room", "unexpected state", err);
 */

type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, tag: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  const prefix = `${ts} ${level.toUpperCase().padEnd(5)} [${tag}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

export const log = {
  debug: (tag: string, message: string, data?: unknown) => write("debug", tag, message, data),
  info: (tag: string, message: string, data?: unknown) => write("info", tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => write("warn", tag, message, data),
  error: (tag: string, message: string, data?: unknown) => write("error", tag, message, data),
};
