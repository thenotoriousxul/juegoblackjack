import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'

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

// Configurar eventos de conexión
io.on('connection', (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id}`)

  socket.on('join', (gameId: string) => {
    socket.join(`game:${gameId}`)
    console.log(`✅ Socket ${socket.id} se unió a game:${gameId}`)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Socket desconectado: ${socket.id}`)
  })


})



// Levantar solo el socket, sin conectar a MongoDB
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO corriendo en http://localhost:${PORT}`)
})


