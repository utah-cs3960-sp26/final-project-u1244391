const Wavelength = require('./games/Wavelength');
const Chameleon = require('./games/Chameleon');

const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateCode() : code;
}

function broadcastRoomUpdate(io, room) {
  const data = {
    code: room.code,
    players: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    hostId: room.hostId,
    gameType: room.gameType,
    theme: room.theme,
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
      const player = {
        id: socket.id,
        name: playerName,
        socketId: socket.id,
        score: 0,
      };

      const room = {
        code,
        players: [player],
        hostId: socket.id,
        gameType: gameType || 'wavelength',
        game: null,
        theme: null,
      };

      rooms.set(code, room);
      socket.join(code);
      socket.emit('room:created', {
        code,
        playerId: socket.id,
        players: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
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

      const player = {
        id: socket.id,
        name: playerName,
        socketId: socket.id,
        score: 0,
      };

      room.players.push(player);
      socket.join(code);
      socket.emit('room:joined', {
        code,
        playerId: socket.id,
        players: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
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

    socket.on('game:start', ({ code, theme }) => {
      const room = rooms.get(code);
      if (!room) return;
      if (socket.id !== room.hostId) return;

      if (theme) room.theme = theme;

      if (room.gameType === 'chameleon') {
        room.game = new Chameleon(code, room.players, room.theme);
      } else {
        room.game = new Wavelength(code, room.players);
      }

      io.to(code).emit('game:started');
      broadcastGameState(io, room);
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
    });

    socket.on('room:leave', ({ code }) => {
      const room = rooms.get(code);
      if (!room) return;

      if (socket.id === room.hostId) {
        // Host left — close the entire room
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
      io.to(code).emit('game:ended');
      broadcastRoomUpdate(io, room);
    });

    socket.on('disconnect', () => {
      for (const [code, room] of rooms) {
        const idx = room.players.findIndex((p) => p.socketId === socket.id);
        if (idx === -1) continue;

        if (socket.id === room.hostId) {
          // Host disconnected — close the entire room
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

module.exports = { registerSocketHandlers };
