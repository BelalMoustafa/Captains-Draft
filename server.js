const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()
  const httpServer = createServer(server)
  
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  })

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      socket.join(roomId)
    })
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId)
    })
  })

  server.use(express.json())
  
  // Internal endpoint for Next.js Server Actions to broadcast events
  server.post('/internal/socket', (req, res) => {
    const { channel, event, data } = req.body
    if (!channel || !event) return res.status(400).json({ error: 'Missing channel or event' })
    
    io.to(channel).emit(event, data)
    res.json({ success: true })
  })

  // Let Next.js handle everything else
  server.use((req, res) => {
    return handle(req, res)
  })

  const port = process.env.PORT || 3000
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
