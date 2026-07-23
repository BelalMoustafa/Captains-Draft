'use client'

import { useState, useEffect, useTransition } from 'react'
import { submitRpsChoice } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { socketClient } from '@/lib/socket-client'
import { Loader2 } from 'lucide-react'

export default function RpsGame({ room, currentUser, users, lang, dict }: any) {
  const [choice, setChoice] = useState<string | null>(null)
  const [opponentReady, setOpponentReady] = useState(false)
  const [result, setResult] = useState<{ type: string, winnerId?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const isSpectator = currentUser.role === 'spectator'
  const players = users.filter((u: any) => u.role !== 'spectator')
  const opponent = players.find((u: any) => u.id !== currentUser.id)

  if (isSpectator) {
    return (
      <Card className="w-full max-w-3xl border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-hidden text-center p-12">
        <h2 className="text-3xl font-black text-slate-800 mb-4">{dict.spectators}</h2>
        <p className="text-slate-500 text-lg">{dict.spectatorWait}</p>
      </Card>
    )
  }

  useEffect(() => {
    socketClient.emit('join-room', `room-${room.code}`); const channel = socketClient;
    
    channel.on('rps-choice-submitted', (data: { userId: string }) => {
      if (data.userId !== currentUser.id) {
        setOpponentReady(true)
      }
    })

    channel.on('rps-result', (data: { type: string, winnerId?: string }) => {
      setResult(data)
      if (data.type === 'tie') {
        setTimeout(() => {
          setChoice(null)
          setOpponentReady(false)
          setResult(null)
        }, 3000)
      }
    })

    return () => {
      channel.off('rps-choice-submitted')
      channel.off('rps-result')
    }
  }, [room.code, currentUser.id])

  const handleChoice = (selected: string) => {
    if (choice || isPending) return
    setChoice(selected)
    startTransition(async () => {
      await submitRpsChoice(room.id, currentUser.id, selected)
    })
  }

  return (
    <Card className="w-full max-w-4xl border border-slate-800 shadow-2xl shadow-indigo-500/10 bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
      <CardHeader className="text-center pb-6 pt-10 border-b border-slate-800/50">
        <CardTitle className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          {dict.title}
        </CardTitle>
        <p className="text-slate-400 font-bold tracking-widest uppercase text-sm mt-2">{dict.subtitle}</p>
      </CardHeader>
      
      <CardContent className="p-12">
        {result ? (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-300">
            {result.type === 'tie' ? (
              <>
                <h2 className="text-6xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">{dict.tie}</h2>
                <p className="text-slate-400 text-xl font-medium tracking-wide">{dict.tieSub}</p>
              </>
            ) : (
              <>
                <h2 className="text-5xl md:text-6xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  {result.winnerId === currentUser.id ? dict.youWon : `${opponent?.name} ${dict.opponentWon}`}
                </h2>
                <p className="text-slate-300 text-xl font-medium tracking-wider">
                  {result.winnerId === currentUser.id ? dict.youFirstPick : dict.theyFirstPick}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-16">
            
            <div className="relative flex justify-between items-center bg-slate-950/50 p-6 rounded-3xl border border-slate-800 shadow-inner">
              <div className="text-center w-1/3 z-10">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">{dict.you}</p>
                <p className="text-2xl font-black text-white truncate px-2">{currentUser.name}</p>
                {choice && <span className="inline-block mt-3 px-4 py-1.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold rounded-full tracking-widest uppercase shadow-[0_0_10px_rgba(99,102,241,0.3)]">{dict.ready}</span>}
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                 <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-600 italic">VS</span>
              </div>
              <div className="text-center w-1/3 z-10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-2">{dict.opponent}</p>
                <p className="text-2xl font-black text-white truncate px-2">{opponent?.name}</p>
                {opponentReady ? (
                  <span className="inline-block mt-3 px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.3)]">{dict.ready}</span>
                ) : (
                  <span className="inline-flex items-center mt-3 px-4 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-full tracking-widest uppercase">
                    <Loader2 className="w-3 h-3 mx-1 animate-spin" /> {dict.thinking}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { id: 'rock', icon: '🪨', label: dict.rock, glow: 'hover:shadow-[0_0_30px_rgba(168,162,158,0.3)]', border: 'hover:border-stone-500', active: 'border-stone-500 bg-stone-900/50 shadow-[0_0_30px_rgba(168,162,158,0.4)]' },
                { id: 'paper', icon: '📄', label: dict.paper, glow: 'hover:shadow-[0_0_30px_rgba(56,189,248,0.3)]', border: 'hover:border-sky-500', active: 'border-sky-500 bg-sky-900/50 shadow-[0_0_30px_rgba(56,189,248,0.4)]' },
                { id: 'scissors', icon: '✂️', label: dict.scissors, glow: 'hover:shadow-[0_0_30px_rgba(248,113,113,0.3)]', border: 'hover:border-red-500', active: 'border-red-500 bg-red-900/50 shadow-[0_0_30px_rgba(248,113,113,0.4)]' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChoice(item.id)}
                  disabled={!!choice || isPending}
                  className={`flex flex-col items-center justify-center p-10 rounded-3xl border border-slate-700 bg-slate-900/80 transition-all duration-300 relative overflow-hidden group
                    ${!choice && !isPending ? `${item.glow} ${item.border} active:scale-95 cursor-pointer` : ''}
                    ${choice === item.id ? `${item.active} scale-105 z-10` : ''}
                    ${(choice && choice !== item.id) || (isPending && choice !== item.id) ? 'opacity-30 scale-95 grayscale' : ''}
                  `}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${choice === item.id ? 'opacity-20' : ''} bg-current`} />
                  <span className="text-7xl mb-6 relative z-10 filter drop-shadow-xl transition-transform group-hover:scale-110">{item.icon}</span>
                  <span className="font-black tracking-widest text-white uppercase text-lg relative z-10">{item.label}</span>
                </button>
              ))}
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}
