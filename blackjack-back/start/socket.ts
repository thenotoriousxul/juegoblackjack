import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import mongoose from 'mongoose';
import { Game } from '../app/mongo_models/game.js';
import { PlayerDeck } from '../app/mongo_models/player_deck.js';

// Puerto para WebSocket
const PORT = 3334

// Crear servidor HTTP vacío (no se usa para HTTP)
const httpServer = createServer()

// Inicializar Socket.IO sobre ese servidor
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
  },
})


// Mapear socketId -> { userId, gameId }
const socketUserGameMap = new Map();

io.on('connection', (socket) => {
  // Manejar leave inmediato desde el frontend
  socket.on('leave', async (gameId: string, userId: number) => {
    console.log(`🚪 Evento leave recibido de user ${userId} en game:${gameId}`);
    const game = await Game.findById(gameId);
    if (game && game.is_active && game.players.includes(userId)) {
      game.is_active = false;
      game.isFinished = true;
      await game.save();
      io.to(`game:${game._id}`).emit('forceLobby', { message: 'Un jugador ha salido. Todos vuelven al lobby.' });
      await PlayerDeck.deleteMany({ gameId: game._id });
    }
  });
  console.log(`🔌 Socket conectado: ${socket.id}`)

  // Cuando un usuario se une a una partida, debe enviar también su userId
  socket.on('join', async (gameId: string, userId: number) => {
    socket.join(`game:${gameId}`);
    socketUserGameMap.set(socket.id, { userId, gameId });
    console.log(`✅ Socket ${socket.id} se unió a game:${gameId} como user ${userId}`);
  });

  socket.on('disconnect', async () => {
    console.log(`❌ Socket desconectado: ${socket.id}`);
    socketUserGameMap.delete(socket.id);
  });
});



// Levantar solo el socket, sin conectar a MongoDB
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO corriendo en http://localhost:${PORT}`)
})


