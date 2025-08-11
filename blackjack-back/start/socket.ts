import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import { Game } from '../app/mongo_models/game.js'
import { PlayerDeck } from '../app/mongo_models/player_deck.js'

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
const socketUserGameMap = new Map<string, { userId: number; gameId: string }>()

// Configurar eventos de conexión
io.on('connection', (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id}`)

  // Unirse a una sala con userId para poder identificar al que abandona conscientemente
  socket.on('join', async (gameId: string, userId: number) => {
    socket.join(`game:${gameId}`)
    socketUserGameMap.set(socket.id, { userId, gameId })
    console.log(`✅ Socket ${socket.id} se unió a game:${gameId} como user ${userId}`)
  })

  // Abandono explícito (botón Salir). Forzar a todos al lobby.
  socket.on('leave', async (gameId: string, userId: number) => {
    try {
      console.log(`🚪 Evento leave recibido de user ${userId} en game:${gameId}`)
      const game = await Game.findById(gameId)
      if (game && game.players.includes(userId)) {
        game.is_active = false
        game.isFinished = true as any
        await game.save()
        // Notificar a todos los jugadores de la sala para que vuelvan al lobby
        io.to(`game:${game._id}`).emit('forceLobby', { message: 'Un jugador ha salido. Todos vuelven al lobby.' })
        // Limpiar mazos de todos los jugadores de la partida
        await PlayerDeck.deleteMany({ gameId: game._id })
      }
    } catch (e) {
      console.error('Error en leave:', e)
    }
  })

  // Salir solo de la sala (navegación), sin afectar estado del juego
  socket.on('leaveRoom', async (gameId: string) => {
    try {
      console.log(`🚪 leaveRoom: Socket ${socket.id} saliendo de game:${gameId}`)
      socket.leave(`game:${gameId}`)
    } catch (e) {
      console.error('Error en leaveRoom:', e)
    }
  })

  socket.on('disconnect', async () => {
    console.log(`❌ Socket desconectado: ${socket.id}`)
    // No forzar lobby en desconexión para no afectar reloads
    socketUserGameMap.delete(socket.id)
  })
})

// Levantar solo el socket, sin conectar a MongoDB
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO corriendo en http://localhost:${PORT}`)
})


