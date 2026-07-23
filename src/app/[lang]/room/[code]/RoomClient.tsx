'use client'

import { useEffect, useState, useTransition } from 'react'
import { socketClient } from '@/lib/socket-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, LogOut, ArrowRightLeft, UserPlus } from 'lucide-react'
import { startRps, exitRoom, swapRoles } from '@/app/actions'
import { useRouter } from 'next/navigation'
import RpsGame from './RpsGame'
import DraftGame from './DraftGame'
import ManagerReveal from './ManagerReveal'
import MatchSimulation from './MatchSimulation'

export default function RoomClient({ room: initialRoom, users: initialUsers, currentUser, lang, dict }: any) {
  const [room, setRoom] = useState(initialRoom)
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Navigation Guard (Hard refresh / Tab close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? The game may be canceled.'
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    socketClient.emit('join-room', `room-${room.code}`); 
    const channel = socketClient;
    
    channel.on('player-joined', (data: { user: any }) => {
      setUsers((prev: any) => {
        if (prev.find((u: any) => u.id === data.user.id)) return prev
        return [...prev, data.user]
      })
    })

    channel.on('player-left', (data: { userId: string }) => {
      setUsers((prev: any) => prev.filter((u: any) => u.id !== data.userId))
    })

    channel.on('roles-swapped', () => {
      router.refresh()
    })

    channel.on('room-updated', (data: { status: string }) => {
      if (data.status === 'aborted') {
        alert('The match was aborted because a player left.')
        router.push(`/${lang}`)
      } else {
        setRoom((prev: any) => ({ ...prev, status: data.status }))
      }
    })

    channel.on('round-resolved', (data: { settings: any, status: string, users: any[] }) => {
      setRoom((prev: any) => ({ ...prev, status: data.status, settings: JSON.stringify(data.settings) }))
      setUsers(data.users)
    })

    return () => {
      socketClient.emit('leave-room', `room-${room.code}`)
      socketClient.off('player-joined')
      socketClient.off('player-left')
      socketClient.off('roles-swapped')
      socketClient.off('room-updated')
      socketClient.off('round-resolved')
    }
  }, [room.code, router, lang])

  useEffect(() => {
    socketClient.emit('join-room', `room-${room.code}`); 
    const channel = socketClient;
    channel.on('rps-result', (data: { type: string, winnerId?: string }) => {
      if (data.type === 'win') {
        setTimeout(() => {
           setRoom((prev: any) => ({ ...prev, status: 'drafting' }))
        }, 3000)
      }
    })
    return () => {
      socketClient.off('rps-result')
    }
  }, [room.code])

  const handleStartRps = () => {
    startTransition(async () => {
      await startRps(room.id)
    })
  }

  const handleExitRoom = async () => {
    if (confirm('Are you sure you want to leave the room?')) {
      await exitRoom(room.id, currentUser.userId || currentUser.id)
      router.push(`/${lang}`)
    }
  }

  const handleSwapRoles = async (p1Id: string, p2Id: string) => {
    startTransition(async () => {
      await swapRoles(room.id, p1Id, p2Id)
    })
  }

  if (room.status === 'aborted') {
    return <div className="p-10 text-center font-bold text-red-500">Match Aborted. A player left.</div>
  }

  if (room.status === 'rps') {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl flex justify-end mb-4">
          <Button variant="destructive" onClick={handleExitRoom}><LogOut className="mr-2 h-4 w-4" /> Exit Room</Button>
        </div>
        <RpsGame room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.rps} />
      </main>
    )
  }
  
  if (room.status === 'drafting') {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-5xl flex justify-end mb-4">
          <Button variant="destructive" onClick={handleExitRoom}><LogOut className="mr-2 h-4 w-4" /> Exit Room</Button>
        </div>
        <DraftGame room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.draft} />
      </main>
    )
  }

  if (room.status === 'manager-assignment') {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 overflow-x-hidden">
        <div className="w-full max-w-5xl flex justify-end mb-4">
          <Button variant="destructive" onClick={handleExitRoom}><LogOut className="mr-2 h-4 w-4" /> Exit Room</Button>
        </div>
        <ManagerReveal room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.manager} />
      </main>
    )
  }

  if (room.status === 'simulation') {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 overflow-x-hidden">
        <div className="w-full max-w-5xl flex justify-end mb-4">
          <Button onClick={() => router.push(`/${lang}`)}><LogOut className="mr-2 h-4 w-4" /> Back to Dashboard</Button>
        </div>
        <MatchSimulation room={room} currentUser={currentUser} users={users} lang={lang} dict={dict.simulation} />
      </main>
    )
  }

  const players = users.filter((u: any) => u.role !== 'spectator')
  const spectators = users.filter((u: any) => u.role === 'spectator')

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <Button variant="destructive" className="bg-red-900/50 text-red-400 hover:bg-red-900/80 hover:text-white border border-red-900/50" onClick={handleExitRoom}>
          <LogOut className="mr-2 h-4 w-4" /> Exit Room
        </Button>
      </div>
      <Card className="w-full max-w-4xl border border-slate-800 shadow-2xl shadow-indigo-500/10 bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
        
        <CardHeader className="text-center pb-8 pt-10 border-b border-slate-800/50">
          <p className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{dict.room?.roomCode || 'ROOM CODE'}</p>
          <CardTitle className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter">
            {room.code}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-12 pb-12 space-y-12">
          {/* VS Animation Area */}
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-0">
            
            {/* Player 1 */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-900/40 to-slate-900/40 rounded-3xl border border-indigo-500/20 shadow-lg relative group">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-xl group-hover:bg-indigo-500/20 transition-all opacity-0 group-hover:opacity-100" />
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4 relative z-10">{dict.room?.player1 || 'HOST'}</p>
              <h3 className="text-3xl font-black text-white text-center relative z-10 truncate w-full px-4">
                {players[0]?.name || (dict.room?.waiting || 'WAITING...')}
              </h3>
            </div>

            {/* VS Badge */}
            <div className="z-20 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex items-center justify-center w-20 h-20 bg-slate-950 rounded-full border-4 border-slate-800 shadow-2xl">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-600 italic">VS</span>
            </div>

            {/* Player 2 */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-gradient-to-bl from-emerald-900/40 to-slate-900/40 rounded-3xl border border-emerald-500/20 shadow-lg relative group">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-xl group-hover:bg-emerald-500/20 transition-all opacity-0 group-hover:opacity-100" />
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-4 relative z-10">{dict.room?.player2 || 'CHALLENGER'}</p>
              <div className="flex items-center justify-center relative z-10 w-full px-4">
                {players[1] ? (
                  <h3 className="text-3xl font-black text-white text-center truncate">{players[1].name}</h3>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    <p className="text-sm font-bold text-slate-400 tracking-widest">{dict.room?.waiting || 'WAITING...'}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {spectators.length > 0 && (
            <div className="pt-8 border-t border-slate-800/50">
              <h4 className="font-bold text-xs text-slate-500 mb-4 uppercase tracking-[0.2em] text-center">Spectators</h4>
              <div className="flex flex-wrap justify-center gap-3">
                {spectators.map((s: any) => (
                  <div key={s.id} className="flex items-center bg-slate-900/80 border border-slate-700 p-2 pl-4 pr-2 rounded-full gap-3 shadow-inner">
                    <span className="text-sm font-bold text-slate-300">{s.name}</span>
                    {currentUser.role === 'admin' && players[1] && (
                      <Button size="sm" className="h-7 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-full transition-colors" onClick={() => handleSwapRoles(s.id, players[1].id)} disabled={isPending}>
                        <ArrowRightLeft className="w-3 h-3 mr-1" /> Swap
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-8">
            {currentUser.role === 'admin' ? (
              <Button 
                onClick={handleStartRps}
                size="lg" 
                isLoading={isPending}
                className="w-full sm:w-auto px-16 py-8 text-xl font-black tracking-widest uppercase bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] transition-all disabled:opacity-50 border border-indigo-400/30"
                disabled={players.length < 2 || isPending}
              >
                {isPending ? (dict.room?.waiting || 'WAITING') : (dict.room?.startRps || 'START MATCH')}
              </Button>
            ) : (
              <div className="text-center space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 inline-block">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-slate-400 font-bold tracking-widest text-sm uppercase">{dict.room?.waitingHostRps || 'WAITING FOR HOST TO START...'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
