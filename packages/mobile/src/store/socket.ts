import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@cards/shared';
import { getServerUrlOverride } from '../lib/settings';

// Resolution order, most → least specific:
//   1. User-entered override (Settings screen), stored in AsyncStorage
//   2. EXPO_PUBLIC_SERVER_URL (build-time env)
//   3. Emulator localhost fallback (10.0.2.2 maps to host on Android emulator)
function resolveServerUrl(): string {
  const override = getServerUrlOverride();
  if (override) return override;
  return process.env.EXPO_PUBLIC_SERVER_URL || 'http://10.0.2.2:3001';
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;
let activeUrl: string | null = null;

export function getSocket(): GameSocket {
  const url = resolveServerUrl();
  if (socket && activeUrl !== url) {
    // URL changed via Settings while we had a cached socket — drop it so the
    // next connect hits the new target.
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    activeUrl = url;
    socket = io(url, {
      autoConnect: false,
      transports: ['websocket'],
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
