import { io } from 'socket.io-client'

export const socketClient = io(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', {
  autoConnect: true
})
