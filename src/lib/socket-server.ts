export const socketServer = {
  trigger: async (channel: string, event: string, data: any) => {
    try {
      await fetch('http://localhost:3000/internal/socket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, event, data })
      })
    } catch (e) {
      console.error('Socket broadcast error', e)
    }
  }
}
