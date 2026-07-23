'use client'

import { useState, useEffect, useTransition } from 'react'
import { generateDraftPool, placeBid, foldBid } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { socketClient } from '@/lib/socket-client'
import { Loader2, Coins, User, Zap } from 'lucide-react'

export default function DraftGame({ room, currentUser, users: initialUsers, lang, dict }: any) {
  const [settings, setSettings] = useState(JSON.parse(room.settings))
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState(false)
  const [customBid, setCustomBid] = useState<string>('')

  const players = users.filter((u: any) => u.role !== 'spectator')
  const isSpectator = currentUser.role === 'spectator'
  
  const me = isSpectator ? players[0] : players.find((u: any) => u.id === currentUser.id)
  const opponent = isSpectator ? players[1] : players.find((u: any) => u.id !== currentUser.id)

  useEffect(() => {
    socketClient.emit('join-room', `room-${room.code}`); const channel = socketClient;
    
    channel.on('draft-pool-generated', (data: { settings: any }) => {
      setSettings(data.settings)
    })

    channel.on('bid-updated', (data: { bidding: any }) => {
      setSettings((prev: any) => ({ ...prev, bidding: data.bidding }))
    })

    channel.on('round-resolved', (data: { settings: any, status: string, users: any[] }) => {
      setSettings(data.settings)
      setUsers(data.users)
    })

    return () => {
      channel.off('draft-pool-generated')
      channel.off('bid-updated')
      channel.off('round-resolved')
    }
  }, [room.code])

  const currentBidLevel = settings?.bidding?.currentBid || 0;
  const minValidBidLevel = currentBidLevel > 0 ? currentBidLevel + 500000 : 500000;
  
  useEffect(() => {
    setCustomBid((minValidBidLevel / 1000000).toString())
  }, [minValidBidLevel])

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

  const formatMoney = (val: number) => `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`

  // For the custom bid input
  const minValidBid = currentBid > 0 ? currentBid + 500000 : 500000; // Minimum increment of 0.5M

  const handleCustomBidSubmit = () => {
    const amount = parseFloat(customBid) * 1000000
    if (!isNaN(amount) && amount > currentBid && amount <= me.budgetLeft) {
      handleBid(amount - currentBid) // handleBid expects amount to add? 
      // Wait, handleBid does `const newBid = (settings.bidding.currentBid || 0) + amount; await placeBid(newBid)`
      // I should update handleBid to accept exact amount! Let's write handleExactBid
    }
  }

  const handleExactBid = (exactAmount: number) => {
    startTransition(async () => {
      await placeBid(room.id, currentUser.id, exactAmount)
    })
  }

  return (
    <div className="w-full max-w-7xl flex flex-col xl:flex-row gap-6">
      
      {/* Center Column: The Auction Stage (Order 1 on mobile, Order 2 on desktop) */}
      <Card className="w-full xl:w-2/4 order-1 xl:order-2 border border-slate-800 shadow-2xl shadow-indigo-500/10 bg-slate-900/50 backdrop-blur-xl overflow-hidden relative rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500" />
        <CardHeader className="text-center pb-2 pt-6">
          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">
            {dict.round} {roundIndex + 1} {dict.of} {settings.format}
          </p>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center">
          
          {/* Player Card */}
          <div className="relative w-64 h-80 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl shadow-2xl p-4 flex flex-col justify-between border border-slate-700 transform transition-all hover:scale-105 group overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="flex justify-between items-start relative z-10">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-500 drop-shadow-md">{visiblePlayer.rating}</div>
              <div className="text-xl font-bold text-slate-400 uppercase tracking-widest">{visiblePlayer.position}</div>
            </div>
            <div className="flex-grow flex items-center justify-center relative z-10">
              <User className="w-32 h-32 text-slate-700/50 group-hover:text-indigo-500/30 transition-colors" />
            </div>
            <div className="text-center relative z-10">
              <h2 className="text-2xl font-black text-white leading-tight uppercase tracking-wide">{visiblePlayer.name}</h2>
              <p className="text-sm font-bold text-slate-400 truncate">{visiblePlayer.club}</p>
            </div>
          </div>

          {/* Bidding Area */}
          <div className="w-full mt-8 bg-slate-950/60 p-6 rounded-3xl border border-slate-800/50 text-center space-y-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-indigo-500/50 rounded-b-full blur-sm" />
            
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">{dict.currentBid}</p>
              <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {currentBid > 0 ? formatMoney(currentBid) : '0M'}
              </div>
              <p className="text-sm font-bold text-indigo-400 mt-3 tracking-widest uppercase">
                {currentBidder ? `${dict.by} ${currentBidder.name}` : dict.waitingOpeningBid}
              </p>
            </div>

            {/* Quick Bids */}
            <div className={`flex justify-center gap-3 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
               <Button
                size="sm"
                variant="outline"
                className="flex-1 font-black bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900"
                disabled={!isMyTurn || isPending || me.budgetLeft < currentBid + 500000}
                onClick={() => handleExactBid(currentBid + 500000)}
              >
                +0.5M
              </Button>
               <Button
                size="sm"
                variant="outline"
                className="flex-1 font-black bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900"
                disabled={!isMyTurn || isPending || me.budgetLeft < currentBid + 1000000}
                onClick={() => handleExactBid(currentBid + 1000000)}
              >
                +1M
              </Button>
               <Button
                size="sm"
                variant="outline"
                className="flex-1 font-black bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900"
                disabled={!isMyTurn || isPending || me.budgetLeft < currentBid + 2000000}
                onClick={() => handleExactBid(currentBid + 2000000)}
              >
                +2M
              </Button>
            </div>

            {/* Custom Bid Input */}
            <div className="flex items-center mt-6">
              <input 
                type="number" 
                step="0.1"
                min={(minValidBid / 1000000).toString()}
                max={(me?.budgetLeft / 1000000).toString()}
                value={customBid}
                onChange={(e) => setCustomBid(e.target.value)}
                className="flex h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-xl text-white text-center font-black tracking-wider outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition-all placeholder-slate-600"
                disabled={!isMyTurn || isPending || isSpectator}
                placeholder="0.0 M"
              />
            </div>

            {/* Actions */}
            <div className={`flex justify-center gap-4 mt-4 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
              <Button
                size="lg"
                variant="outline"
                className="w-1/3 h-14 rounded-2xl border-2 border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-900/40 hover:text-red-300 hover:border-red-500/50 font-black tracking-widest uppercase disabled:opacity-30 transition-all"
                disabled={!isMyTurn || isPending || isSpectator || currentBid === 0}
                isLoading={isPending && settings.bidding.currentBidderId === currentUser.id} 
                onClick={handleFold}
              >
                {dict.fold}
              </Button>
              <Button
                size="lg"
                className="w-2/3 h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-teal-500 hover:to-emerald-400 text-white font-black tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-30 transition-all"
                disabled={
                  !isMyTurn || 
                  isPending || 
                  isSpectator ||
                  isNaN(parseFloat(customBid)) || 
                  parseFloat(customBid) * 1000000 <= currentBid ||
                  parseFloat(customBid) * 1000000 > me?.budgetLeft
                }
                isLoading={isPending && settings.bidding.currentBidderId !== currentUser.id}
                onClick={() => handleExactBid(parseFloat(customBid) * 1000000)}
              >
                {dict.placeBid || "Place Bid"}
              </Button>
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-800/50">
              <p className="text-xs font-black tracking-[0.2em] uppercase text-slate-500">
                {isMyTurn ? <span className="text-emerald-400">{dict.yourTurn}</span> : `${dict.waitingOpponent} ${opponent?.name}...`}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Left Column: Player Squad (Order 2 on mobile, Order 1 on desktop) */}
      <Card className="w-full xl:w-1/4 order-2 xl:order-1 border border-slate-800 shadow-xl bg-slate-900/40 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className={`pb-4 bg-slate-950/50 border-b border-slate-800/50 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">{dict.yourSquad}</p>
          <h3 className="text-2xl font-black text-white">{me.name}</h3>
          <div className={`flex items-center text-emerald-400 font-black text-3xl mt-3 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] ${lang === 'ar' ? 'justify-end' : ''}`}>
            <Coins className={`w-8 h-8 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {formatMoney(me.budgetLeft)}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {JSON.parse(me.squad).map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-indigo-500/30 transition-colors">
              <span className="font-bold text-slate-300 text-sm truncate max-w-[70%]">{p.name}</span>
              <span className="font-black text-amber-400 text-sm drop-shadow-md">{p.rating}</span>
            </div>
          ))}
          {JSON.parse(me.squad).length === 0 && (
            <p className="text-center text-slate-600 font-bold text-sm uppercase tracking-wider py-8">Squad Empty</p>
          )}
        </CardContent>
      </Card>

      {/* Right Column: Opponent Squad (Order 3 on mobile, Order 3 on desktop) */}
      <Card className="w-full xl:w-1/4 order-3 border border-slate-800 shadow-xl bg-slate-900/40 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className={`pb-4 bg-slate-950/50 border-b border-slate-800/50 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{dict.opponentSquad}</p>
          <h3 className="text-2xl font-black text-slate-300">{opponent?.name}</h3>
          <div className={`flex items-center text-slate-400 font-black text-3xl mt-3 ${lang === 'ar' ? 'justify-start' : 'justify-end'}`}>
            <Coins className={`w-8 h-8 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {opponent ? formatMoney(opponent.budgetLeft) : '0M'}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {JSON.parse(opponent?.squad || '[]').map((p: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/30 border border-slate-800/30">
              <span className="font-bold text-slate-500 text-sm truncate max-w-[70%]">{p.name}</span>
              <span className="font-black text-slate-600 text-sm">{p.rating}</span>
            </div>
          ))}
          {JSON.parse(opponent?.squad || '[]').length === 0 && (
            <p className="text-center text-slate-700 font-bold text-sm uppercase tracking-wider py-8">Squad Empty</p>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
