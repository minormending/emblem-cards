import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@cards/shared";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3001"
    : typeof window !== "undefined"
      ? window.location.origin
      : "");

// When the app is hosted behind a path prefix (e.g. /emblem/ on a multi-app
// gateway), socket.io needs to be told where its endpoint lives. Defaults to
// the socket.io default so local dev requires no config.
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io/";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      path: SOCKET_PATH,
      // websocket first for low latency, polling as a fallback. Some hostile
      // networks (corporate proxies, captive portals, certain mobile
      // carriers) block WebSocket upgrades; without polling the user just
      // sees an indefinite spinner with no way to recover.
      transports: ["websocket", "polling"],
      // Bound the per-attempt window so we surface a connect_error in
      // gameStore's connectAndRun (see L2) instead of hanging forever.
      timeout: 10_000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
