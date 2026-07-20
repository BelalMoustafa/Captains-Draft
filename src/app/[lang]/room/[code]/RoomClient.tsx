'use client'

import { useEffect, useState, useTransition } from 'react'
import { pusherClient } from '@/lib/pusher-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { startRps } from '@/app/actions'
import RpsGame from './RpsGame'
import DraftGame from './DraftGame'
import ManagerReveal from './ManagerReveal'
import MatchSimulation from './MatchSimulation'

export default function RoomClient({ room: initialRoom, users: initialUsers, currentUser, lang, dict }: any) {
  const [room, setRoom] = useState(initialRoom)
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${room.code}`)
    
    channel.bind('player-joined', (data: { user: any }) => {
      setUsers((prev: any) => {
        if (prev.find((u: any) => u.id === data.user.id)) return prev
        return [...prev, data.user]
      })
    })

    channel.bind('room-updated', (data: { status: string }) => {
      setRoom((prev: any) => ({ ...prev, status: data.status }))
    })

    channel.bind('round-resolved', (data: { settings: any, status: string, users: any[] }) => {
      setRoom((prev: any) => ({ ...prev, status: data.status, settings: JSON.stringify(data.settings) }))
      setUsers(data.users)
    })

    return () => {
      pusherClient.unsubscribe(`room-${room.code}`)
    }
  }, [room.code])

  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${room.code}`)
    channel.bind('rps-result', (data: { type: string, winnerId?: string }) => {
      if (data.type === 'win') {
        setTimeout(() => {
           setRoom((prev: any) => ({ ...prev, status: 'drafting' }))
        }, 3000)
      }
    })
    return () => {
      pusherClient.unsubscribe(`room-${room.code}`)
    }
  }, [room.code])

  const handleStartRps = () => {
    startTransition(async () => {
      await startRps(room.id)
    })
  }

  if (room.status === 'rps') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <RpsGame room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.rps} />
      </main>
    )
  }
  
  if (room.status === 'drafting') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <DraftGame room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.draft} />
      </main>
    )
  }

  if (room.status === 'manager-assignment') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-x-hidden">
        <ManagerReveal room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.manager} />
      </main>
    )
  }

  if (room.status === 'simulation') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-x-hidden">
        <MatchSimulation room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.simulation} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-none shadow-2xl bg-white/80 backdrop-blur-md">
        <CardHeader className="text-center pb-8 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{dict.room.roomCode}</p>
          <CardTitle className="text-6xl font-black text-slate-800 tracking-tighter">
            {room.code}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{dict.room.player1}</p>
              <p className="text-xl font-bold text-slate-800">
                {users[0]?.name || dict.room.waiting}
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{dict.room.player2}</p>
              <div className="flex items-center justify-center space-x-2">
                {users[1] ? (
                  <p className="text-xl font-bold text-emerald-600">{users[1].name}</p>
                ) : (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    <p className="text-xl font-bold text-slate-400">{dict.room.waiting}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            {currentUser.role === 'admin' && (
              <Button 
                onClick={handleStartRps}
                size="lg" 
                isLoading={isPending}
                className="w-full sm:w-auto px-12 py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                disabled={users.length < 2 || isPending}
              >
                {isPending ? dict.room.waiting : dict.room.startRps}
              </Button>
            )}
            {currentUser.role === 'player' && (
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-slate-500 font-medium">{dict.room.waitingHostRps}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
