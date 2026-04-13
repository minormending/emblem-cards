import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@cards/shared";
import { formatError } from "@cards/shared";
import { GameRoom } from "./GameRoom.js";
import { MatchmakingQueue } from "./matchmaking.js";
import { validateDeck, isValidFieldPosition, isValidHandIndex } from "./validate.js";
import { SessionStore, validateAuth } from "./sessions.js";
import { log } from "./logger.js";

const PORT = Number(process.env.PORT ?? 3001);

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];
const corsOrigin = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : defaultOrigins;

const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const sessions = new SessionStore();
const queue = new MatchmakingQueue();
const rooms = new Map<string, GameRoom>();
const playerRooms = new Map<string, string>();

let roomCounter = 0;

// ── Helpers ──

/** playerId → current live socketId (or null if not authenticated). */
function socketIdFor(playerId: string): string | null {
  return sessions.getByPlayer(playerId)?.socketId ?? null;
}

/** Push the current game view to each player in a room, plus game:over on win. */
function broadcastGameUpdate(room: GameRoom): void {
  for (const pid of room.playerIds) {
    const socketId = socketIdFor(pid);
    if (!socketId) continue;
    const view = room.getView(pid);
    io.to(socketId).emit("game:update", view);
    if (view.winner) {
      io.to(socketId).emit("game:over", {
        winner: view.winner,
        turnCount: view.turnNumber,
      });
    }
  }
}

/** Short ID prefix for logs, e.g. "abc12345". */
function shortId(id: string | undefined | null): string {
  return id ? id.slice(0, 8) : "?";
}

io.on("connection", (socket) => {
  log.info("connect", `${socket.id} connected`);

  // ── Auth ──

  socket.on("auth", (payload) => {
    const validationError = validateAuth(payload);
    if (validationError) {
      socket.emit("auth:error", validationError);
      log.warn("auth", `${socket.id} rejected`, { reason: validationError });
      return;
    }

    const { playerId, displayName } = payload;
    const { oldSocketId } = sessions.authenticate(socket.id, playerId, displayName);

    if (oldSocketId) {
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      oldSocket?.emit("auth:error", "Signed in from another location");
      oldSocket?.disconnect(true);
      log.info("auth", `${shortId(playerId)} replaced session`, { old: oldSocketId, new: socket.id });
    }

    socket.emit("auth:ok");
    log.info("auth", `${socket.id} authenticated as ${displayName}`, { playerId: shortId(playerId) });
  });

  // ── Matchmaking ──

  socket.on("queue:join", (deck) => {
    const playerId = requireAuthOrError(socket);
    if (!playerId) return;

    const deckCheck = validateDeck(deck);
    if (!deckCheck.ok) {
      socket.emit("game:error", deckCheck.error);
      log.warn("queue", `${shortId(playerId)} deck rejected`, { reason: deckCheck.error });
      return;
    }

    // Use the authoritative card objects, not whatever the client sent.
    const pos = queue.add(playerId, deckCheck.cards);
    socket.emit("queue:joined", { position: pos });
    log.info("queue", `${shortId(playerId)} joined`, { size: queue.size });

    tryStartMatch();
  });

  socket.on("queue:leave", () => {
    const playerId = requireAuth(socket);
    if (playerId) queue.remove(playerId);
  });

  // ── Game actions ──

  socket.on("game:deploy", (handIndex, target) => {
    const ctx = requireGameContext(socket);
    if (!ctx) return;

    if (!isValidHandIndex(handIndex)) {
      return socket.emit("game:error", "Invalid hand index");
    }
    if (target !== undefined && !isValidFieldPosition(target)) {
      return socket.emit("game:error", "Invalid target position");
    }

    const result = ctx.room.deploy(ctx.playerId, handIndex, target);
    if (!result.ok) {
      return socket.emit("game:error", formatError(result.error));
    }

    socket.emit("game:action-result", { type: "deploy" });
    broadcastGameUpdate(ctx.room);
  });

  socket.on("game:attack", (from, to) => {
    const ctx = requireGameContext(socket);
    if (!ctx) return;

    if (!isValidFieldPosition(from) || !isValidFieldPosition(to)) {
      return socket.emit("game:error", "Invalid attack positions");
    }

    const result = ctx.room.attack(ctx.playerId, from, to);
    if (!result.ok) {
      return socket.emit("game:error", formatError(result.error));
    }

    // Pull damage amount out of the events so clients can show the toast.
    // If there are zero unit_damaged events, use 0 (shouldn't happen for a
    // successful attack, but type-safe anyway).
    const damageEvent = result.value.find((e) => e.kind === "unit_damaged");
    const damage = damageEvent?.kind === "unit_damaged" ? damageEvent.amount : 0;
    const attackResult = { type: "attack" as const, damage, targetPos: to };

    socket.emit("game:action-result", attackResult);
    const opponentId = ctx.room.playerIds.find((id) => id !== ctx.playerId);
    const opponentSocket = opponentId ? socketIdFor(opponentId) : null;
    if (opponentSocket) {
      io.to(opponentSocket).emit("game:action-result", attackResult);
    }

    broadcastGameUpdate(ctx.room);
  });

  socket.on("game:end-turn", () => {
    const ctx = requireGameContext(socket);
    if (!ctx) return;

    const result = ctx.room.doEndTurn(ctx.playerId);
    if (!result.ok) {
      return socket.emit("game:error", formatError(result.error));
    }
    socket.emit("game:action-result", { type: "end-turn" });
    broadcastGameUpdate(ctx.room);
  });

  // ── Disconnect ──

  socket.on("disconnect", () => {
    const session = sessions.removeBySocket(socket.id);
    const playerId = session?.playerId;
    log.info("disconnect", `${socket.id} disconnected`, { playerId: shortId(playerId) });

    if (!playerId) return;
    queue.remove(playerId);

    const roomId = playerRooms.get(playerId);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (room && !room.state.winner) {
      // Forfeit — opponent wins
      const opponentId = room.playerIds.find((id) => id !== playerId);
      if (opponentId) {
        room.state.winner = opponentId;
        const opponentSocket = socketIdFor(opponentId);
        if (opponentSocket) {
          io.to(opponentSocket).emit("game:update", room.getView(opponentId));
          io.to(opponentSocket).emit("game:over", {
            winner: opponentId,
            turnCount: room.state.turnNumber,
          });
        }
      }
    }

    // Cleanup
    playerRooms.delete(playerId);
    const otherPlayer = room?.playerIds.find((id) => id !== playerId);
    if (otherPlayer) playerRooms.delete(otherPlayer);
    rooms.delete(roomId);
  });
});

// ── Socket helpers (reduce repetition in event handlers) ──

function requireAuth(socket: { id: string }): string | null {
  return sessions.getBySocket(socket.id)?.playerId ?? null;
}

function requireAuthOrError(socket: {
  id: string;
  emit: (ev: "game:error", msg: string) => unknown;
}): string | null {
  const playerId = requireAuth(socket);
  if (!playerId) socket.emit("game:error", "Not authenticated");
  return playerId;
}

interface GameContext {
  playerId: string;
  room: GameRoom;
}

/** Auth + in-a-game check in one call. Emits errors directly on failure. */
function requireGameContext(socket: {
  id: string;
  emit: (ev: "game:error", msg: string) => unknown;
}): GameContext | null {
  const playerId = requireAuthOrError(socket);
  if (!playerId) return null;

  const roomId = playerRooms.get(playerId);
  if (!roomId) {
    socket.emit("game:error", "Not in a game");
    return null;
  }
  const room = rooms.get(roomId);
  if (!room) {
    socket.emit("game:error", "Game not found");
    return null;
  }
  return { playerId, room };
}

// ── Matchmaking ──

function tryStartMatch(): void {
  const match = queue.tryMatch();
  if (!match) return;

  const [p1, p2] = match;
  roomCounter++;
  const roomId = `room-${roomCounter}`;

  const p1Name = sessions.getByPlayer(p1.socketId)?.displayName ?? "Player 1";
  const p2Name = sessions.getByPlayer(p2.socketId)?.displayName ?? "Player 2";

  const room = new GameRoom(roomId, p1.socketId, p1.deck, p2.socketId, p2.deck, p1Name, p2Name);
  rooms.set(roomId, room);
  playerRooms.set(p1.socketId, roomId);
  playerRooms.set(p2.socketId, roomId);

  const p1Socket = socketIdFor(p1.socketId);
  const p2Socket = socketIdFor(p2.socketId);
  if (p1Socket) io.sockets.sockets.get(p1Socket)?.join(roomId);
  if (p2Socket) io.sockets.sockets.get(p2Socket)?.join(roomId);

  log.info("match", `${p1Name} vs ${p2Name}`, { roomId });

  if (p1Socket) io.to(p1Socket).emit("game:start", room.getView(p1.socketId));
  if (p2Socket) io.to(p2Socket).emit("game:start", room.getView(p2.socketId));
}

httpServer.listen(PORT, () => {
  log.info("server", `listening on :${PORT}`);
});
