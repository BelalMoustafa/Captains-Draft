'use client'

import { useState, useEffect, useTransition } from 'react'
import { generateDraftPool, placeBid, foldBid } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pusherClient } from '@/lib/pusher-client'
import { Loader2, Coins, User, Zap } from 'lucide-react'

export default function DraftGame({ room, currentUser, users: initialUsers, lang, dict }: any) {
  const [settings, setSettings] = useState(JSON.parse(room.settings))
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState(false) // Keep local loading for pusher latency if needed, or rely purely on isPending

  const opponent = users.find((u: any) => u.id !== currentUser.id)
  const me = users.find((u: any) => u.id === currentUser.id)

  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${room.code}`)
    
    channel.bind('draft-pool-generated', (data: { settings: any }) => {
      setSettings(data.settings)
    })

    channel.bind('bid-updated', (data: { bidding: any }) => {
      setSettings((prev: any) => ({ ...prev, bidding: data.bidding }))
    })

    channel.bind('round-resolved', (data: { settings: any, status: string, users: any[] }) => {
      setSettings(data.settings)
      setUsers(data.users)
    })

    return () => {
      pusherClient.unsubscribe(`room-${room.code}`)
    }
  }, [room.code])

  const handleGenerate = () => {
    startTransition(async () => {
      await generateDraftPool(room.id, lang)
    })
  }

  const handleBid = (amount: number) => {
    startTransition(async () => {
      const newBid = (settings.bidding.currentBid || 0) + amount
      await placeBid(room.id, currentUser.id, newBid)
    })
  }

  const handleFold = () => {
    startTransition(async () => {
      await foldBid(room.id, currentUser.id)
    })
  }

  if (!settings.draftPool) {
    return (
      <Card className="w-full max-w-lg border-none shadow-2xl bg-white/90 backdrop-blur-md">
        <CardHeader className="text-center pb-6 border-b border-slate-100">
          <CardTitle className="text-3xl font-black text-slate-800">{dict.title}</CardTitle>
          <p className="text-slate-500 font-medium">{dict.poweredBy}</p>
        </CardHeader>
        <CardContent className="p-8 text-center">
          {currentUser.role === 'admin' ? (
            <Button 
              onClick={handleGenerate} 
              isLoading={isPending}
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-all"
            >
              {!isPending && <Zap className={`w-5 h-5 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} />}
              {isPending ? dict.generating : dict.generatePlayers}
            </Button>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-slate-500 font-medium">{dict.waitingHostGenerate}</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const roundIndex = settings.currentRound
  if (roundIndex >= settings.format) return null

  const roundData = settings.draftPool[roundIndex]
  const visiblePlayer = roundData.visiblePlayer
  const isMyTurn = settings.bidding.turnId === currentUser.id
  const currentBid = settings.bidding.currentBid
  const currentBidder = users.find((u:any) => u.id === settings.bidding.currentBidderId)

  return (
    <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6">
      
      {/* Left Column: Player Squad & Budget */}
      <Card className="w-full md:w-1/4 border-none shadow-xl bg-white/80 backdrop-blur-md">
        <CardHeader className={`pb-4 bg-slate-50/50 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-sm font-bold text-slate-400 uppercase">{dict.yourSquad}</p>
          <h3 className="text-xl font-bold text-slate-800">{me.name}</h3>
          <div className={`flex items-center text-emerald-600 font-black text-2xl mt-2 ${lang === 'ar' ? 'justify-end' : ''}`}>
            <Coins className={`w-6 h-6 ${lang === 'ar' ? 'ml-1' : 'mr-1'}`} /> {me.budgetLeft}M
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {JSON.parse(me.squad).map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-100/50 border border-slate-100">
              <span className="font-semibold text-slate-700 text-sm truncate max-w-[70%]">{p.name}</span>
              <span className="font-black text-indigo-600 text-sm">{p.rating}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Center Column: The Auction Stage */}
      <Card className="w-full md:w-2/4 border-none shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
        <CardHeader className="text-center pb-2">
          <p className="text-sm font-black text-indigo-500 uppercase tracking-widest">
            {dict.round} {roundIndex + 1} {dict.of} {settings.format}
          </p>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center">
          
          {/* Player Card */}
          <div className="relative w-64 h-80 bg-gradient-to-br from-amber-100 to-amber-300 rounded-2xl shadow-xl p-4 flex flex-col justify-between border-4 border-amber-200 transform transition-transform hover:scale-105">
            <div className="flex justify-between items-start">
              <div className="text-5xl font-black text-amber-900">{visiblePlayer.rating}</div>
              <div className="text-xl font-bold text-amber-800 uppercase">{visiblePlayer.position}</div>
            </div>
            <div className="flex-grow flex items-center justify-center">
              <User className="w-32 h-32 text-amber-700/50" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-amber-950 leading-tight">{visiblePlayer.name}</h2>
              <p className="text-sm font-bold text-amber-800 truncate">{visiblePlayer.club}</p>
            </div>
          </div>

          {/* Bidding Area */}
          <div className="w-full mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-6">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase mb-1">{dict.currentBid}</p>
              <div className="text-6xl font-black text-slate-800 tracking-tighter">
                {currentBid > 0 ? `${currentBid}M` : '0M'}
              </div>
              <p className="text-sm font-semibold text-indigo-600 mt-2">
                {currentBidder ? `${dict.by} ${currentBidder.name}` : dict.waitingOpeningBid}
              </p>
            </div>

            {/* Action Buttons */}
            <div className={`flex justify-center gap-4 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
              <Button
                size="lg"
                variant="outline"
                className="w-1/3 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold disabled:opacity-50"
                disabled={!isMyTurn || isPending}
                isLoading={isPending && settings.bidding.currentBidderId === currentUser.id} // Approximation for fold loading vs bid loading
                onClick={handleFold}
              >
                {dict.fold}
              </Button>
              <Button
                size="lg"
                className="w-1/3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200 disabled:opacity-50"
                disabled={!isMyTurn || isPending || me.budgetLeft < currentBid + 1}
                isLoading={isPending && settings.bidding.currentBidderId !== currentUser.id}
                onClick={() => handleBid(1)}
              >
                {dict.bidPlus1}
              </Button>
            </div>
            
            <p className="text-sm font-medium text-slate-500">
              {isMyTurn ? dict.yourTurn : `${dict.waitingOpponent}${opponent?.name}...`}
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Right Column: Opponent Squad & Budget */}
      <Card className="w-full md:w-1/4 border-none shadow-xl bg-white/80 backdrop-blur-md opacity-80">
        <CardHeader className={`pb-4 bg-slate-50/50 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
          <p className="text-sm font-bold text-slate-400 uppercase">{dict.opponentSquad}</p>
          <h3 className="text-xl font-bold text-slate-800">{opponent?.name}</h3>
          <div className={`flex items-center justify-end text-slate-600 font-black text-2xl mt-2 ${lang === 'ar' ? 'justify-start' : 'justify-end'}`}>
            <Coins className={`w-6 h-6 ${lang === 'ar' ? 'ml-1' : 'mr-1'} text-slate-400`} /> {opponent?.budgetLeft}M
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {JSON.parse(opponent?.squad || '[]').map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-100/50 border border-slate-100">
              <span className="font-semibold text-slate-500 text-sm truncate max-w-[70%]">{p.name}</span>
              <span className="font-black text-slate-400 text-sm">{p.rating}</span>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  )
}
