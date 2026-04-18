const Wavelength = require('./games/Wavelength');
const Chameleon = require('./games/Chameleon');

const rooms = new Map();

const PLAYER_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#F43F5E',
  '#84CC16', '#06B6D4', '#8B5CF6', '#D946EF', '#FB923C',
  '#34D399', '#60A5FA', '#F472B6', '#A3E635', '#FBBF24',
];

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateCode() : code;
}

function pickColor(room) {
  const taken = room.players.map((p) => p.color);
  const available = PLAYER_COLORS.filter((c) => !taken.includes(c));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

function playerData(p) {
  return { id: p.id, name: p.name, score: p.score, color: p.color };
}

function broadcastRoomUpdate(io, room) {
  const data = {
    code: room.code,
    players: room.players.map(playerData),
    hostId: room.hostId,
    gameType: room.gameType,
    theme: room.theme,
    chat: room.chat || [],
  };
  io.to(room.code).emit('room:update', data);
}

function broadcastGameState(io, room) {
  if (!room.game) return;
  for (const player of room.players) {
    const state = room.game.getStateFor(player.id);
    io.to(player.socketId).emit('game:state', state);
  }
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:create', ({ playerName, gameType }) => {
      const code = generateCode();
      const color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
      const player = {
        id: socket.id,
        name: playerName,
        socketId: socket.id,
        score: 0,
        color,
      };

      const room = {
        code,
        players: [player],
        hostId: socket.id,
        gameType: gameType || 'wavelength',
        game: null,
        theme: null,
        chat: [],
      };

      rooms.set(code, room);
      socket.join(code);
      socket.emit('room:created', {
        code,
        playerId: socket.id,
        playerColor: color,
        players: room.players.map(playerData),
        hostId: room.hostId,
        gameType: room.gameType,
      });
      broadcastRoomUpdate(io, room);
    });

    socket.on('room:join', ({ code, playerName }) => {
      const room = rooms.get(code);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      const existing = room.players.find((p) => p.id === socket.id);
      if (existing) {
        socket.emit('room:error', { message: 'Already in this room' });
        return;
      }

      const color = pickColor(room);
      const player = {
        id: socket.id,
        name: playerName,
        socketId: socket.id,
        score: 0,
        color,
      };

      room.players.push(player);
      socket.join(code);
      socket.emit('room:joined', {
        code,
        playerId: socket.id,
        playerColor: color,
        players: room.players.map(playerData),
        hostId: room.hostId,
        gameType: room.gameType,
      });
      broadcastRoomUpdate(io, room);
    });

    socket.on('room:setTheme', ({ code, theme }) => {
      const room = rooms.get(code);
      if (!room) return;
      if (socket.id !== room.hostId) return;
      room.theme = theme;
      broadcastRoomUpdate(io, room);
    });

    socket.on('player:update', ({ code, name, color }) => {
      const room = rooms.get(code);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      if (name !== undefined) {
        const trimmed = name.trim();
        if (trimmed.length > 0) player.name = trimmed;
      }

      if (color !== undefined && PLAYER_COLORS.includes(color)) {
        const taken = room.players.filter((p) => p.id !== socket.id).map((p) => p.color);
        if (!taken.includes(color)) {
          player.color = color;
        }
      }

      broadcastRoomUpdate(io, room);
    });

    socket.on('chat:send', ({ code, message }) => {
      const room = rooms.get(code);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const text = (message || '').slice(0, 200);
      if (!text.trim()) return;

      const chatMsg = {
        playerId: player.id,
        name: player.name,
        color: player.color,
        message: text,
        timestamp: Date.now(),
      };

      room.chat.push(chatMsg);
      io.to(code).emit('chat:message', chatMsg);
    });

    socket.on('game:start', ({ code, theme }) => {
      const room = rooms.get(code);
      if (!room) return;
      if (socket.id !== room.hostId) return;
      if (room.countingDown) return;

      if (theme) room.theme = theme;
      room.chat = [];
      room.countingDown = true;

      io.to(code).emit('game:countdown', { seconds: 5 });

      setTimeout(() => {
        const currentRoom = rooms.get(code);
        if (!currentRoom) return;
        currentRoom.countingDown = false;

        if (currentRoom.gameType === 'chameleon') {
          currentRoom.game = new Chameleon(code, currentRoom.players, currentRoom.theme);
        } else {
          currentRoom.game = new Wavelength(code, currentRoom.players);
        }

        io.to(code).emit('game:started');
        broadcastGameState(io, currentRoom);
      }, 5000);
    });

    socket.on('game:action', async ({ code, action, payload }) => {
      const room = rooms.get(code);
      if (!room || !room.game) return;

      const result = await room.game.handleAction(socket.id, action, payload);
      if (result && result.error) {
        socket.emit('game:error', { message: result.error });
        return;
      }
      broadcastGameState(io, room);

      if (result && result.delayAdvance) {
        const delay = result.delayAdvance * 1000;
        setTimeout(() => {
          const currentRoom = rooms.get(code);
          if (!currentRoom || !currentRoom.game) return;
          if (typeof currentRoom.game.advanceFromBetweenRounds === 'function') {
            currentRoom.game.advanceFromBetweenRounds();
            broadcastGameState(io, currentRoom);
          }
        }, delay);
      }
    });

    socket.on('room:leave', ({ code }) => {
      const room = rooms.get(code);
      if (!room) return;

      if (socket.id === room.hostId) {
        if (room.game && room.game.phases) {
          room.game.phases.clearTimers();
        }
        io.to(code).emit('room:closed');
        rooms.delete(code);
      } else {
        const idx = room.players.findIndex((p) => p.socketId === socket.id);
        if (idx !== -1) room.players.splice(idx, 1);
        socket.leave(code);
        broadcastRoomUpdate(io, room);
      }
    });

    socket.on('game:end', ({ code }) => {
      const room = rooms.get(code);
      if (!room) return;
      if (socket.id !== room.hostId) return;

      room.game = null;
      room.chat = [];
      io.to(code).emit('game:ended');
      broadcastRoomUpdate(io, room);
    });

    socket.on('disconnect', () => {
      for (const [code, room] of rooms) {
        const idx = room.players.findIndex((p) => p.socketId === socket.id);
        if (idx === -1) continue;

        if (socket.id === room.hostId) {
          if (room.game && room.game.phases) {
            room.game.phases.clearTimers();
          }
          io.to(code).emit('room:closed');
          rooms.delete(code);
        } else {
          room.players.splice(idx, 1);
          broadcastRoomUpdate(io, room);
        }
      }
    });
  });
}

module.exports = { registerSocketHandlers, PLAYER_COLORS };
