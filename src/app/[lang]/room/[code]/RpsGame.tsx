'use client'

import { useState, useEffect, useTransition } from 'react'
import { submitRpsChoice } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { pusherClient } from '@/lib/pusher-client'
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
    const channel = pusherClient.subscribe(`room-${room.code}`)
    
    channel.bind('rps-choice-submitted', (data: { userId: string }) => {
      if (data.userId !== currentUser.id) {
        setOpponentReady(true)
      }
    })

    channel.bind('rps-result', (data: { type: string, winnerId?: string }) => {
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
      pusherClient.unsubscribe(`room-${room.code}`)
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
    <Card className="w-full max-w-3xl border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-hidden">
      <CardHeader className="text-center pb-6 bg-slate-50 border-b border-slate-100">
        <CardTitle className="text-4xl font-black text-slate-800">
          {dict.title}
        </CardTitle>
        <p className="text-slate-500 font-medium">{dict.subtitle}</p>
      </CardHeader>
      
      <CardContent className="p-8">
        {result ? (
          <div className="text-center py-12 space-y-6 animate-in zoom-in duration-300">
            {result.type === 'tie' ? (
              <>
                <h2 className="text-5xl font-black text-amber-500">{dict.tie}</h2>
                <p className="text-slate-500 text-lg">{dict.tieSub}</p>
              </>
            ) : (
              <>
                <h2 className="text-5xl font-black text-emerald-600">
                  {result.winnerId === currentUser.id ? dict.youWon : `${opponent?.name}${dict.opponentWon}`}
                </h2>
                <p className="text-slate-500 text-lg">
                  {result.winnerId === currentUser.id ? dict.youFirstPick : dict.theyFirstPick}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="text-center w-1/3">
                <p className="text-sm font-bold text-slate-400 uppercase">{dict.you}</p>
                <p className="text-lg font-bold text-slate-800">{currentUser.name}</p>
                {choice && <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{dict.ready}</span>}
              </div>
              <div className="text-4xl font-black text-slate-300">VS</div>
              <div className="text-center w-1/3">
                <p className="text-sm font-bold text-slate-400 uppercase">{dict.opponent}</p>
                <p className="text-lg font-bold text-slate-800">{opponent?.name}</p>
                {opponentReady ? (
                  <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{dict.ready}</span>
                ) : (
                  <span className="inline-flex items-center mt-2 px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
                    <Loader2 className="w-3 h-3 mx-1 animate-spin" /> {dict.thinking}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { id: 'rock', icon: '🪨', label: dict.rock, color: 'hover:border-stone-500 hover:bg-stone-50' },
                { id: 'paper', icon: '📄', label: dict.paper, color: 'hover:border-blue-500 hover:bg-blue-50' },
                { id: 'scissors', icon: '✂️', label: dict.scissors, color: 'hover:border-red-500 hover:bg-red-50' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChoice(item.id)}
                  disabled={!!choice || isPending}
                  className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-slate-100 bg-white shadow-sm transition-all duration-200 
                    ${!choice && !isPending ? item.color + ' active:scale-95 cursor-pointer hover:shadow-md' : ''}
                    ${choice === item.id ? 'border-emerald-500 bg-emerald-50 scale-105 shadow-emerald-100/50' : ''}
                    ${(choice && choice !== item.id) || (isPending && choice !== item.id) ? 'opacity-40 scale-95 grayscale' : ''}
                  `}
                >
                  <span className="text-6xl mb-4">{item.icon}</span>
                  <span className="font-bold text-slate-700 capitalize text-lg">{item.label}</span>
                </button>
              ))}
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  )
}
