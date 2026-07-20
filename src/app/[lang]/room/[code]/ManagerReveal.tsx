'use client'

import { useState, useEffect, useTransition } from 'react'
import { assignManagers, startSimulation } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pusherClient } from '@/lib/pusher-client'
import { Loader2, Coins, Briefcase, PlayCircle } from 'lucide-react'

export default function ManagerReveal({ room, currentUser, users: initialUsers, lang, dict }: any) {
  const [users, setUsers] = useState(initialUsers)
  const [isPendingAssign, startTransitionAssign] = useTransition()
  const [isPendingSimulate, startTransitionSimulate] = useTransition()

  const players = users.filter((u: any) => u.role !== 'spectator')
  const isSpectator = currentUser.role === 'spectator'
  const me = isSpectator ? players[0] : players.find((u: any) => u.id === currentUser.id)
  const opponent = isSpectator ? players[1] : players.find((u: any) => u.id !== currentUser.id)

  const isAssigned = me?.manager && me.manager !== "null" && opponent?.manager && opponent.manager !== "null"

  const parseManager = (managerStr: string) => {
    if (!managerStr || managerStr === "null") return { name: "Pending", tier: "Pending", tacticalStyle: "Pending" }
    try { return JSON.parse(managerStr) } catch { return { name: "Error", tier: "Error", tacticalStyle: "Error" } }
  }

  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${room.code}`)
    
    channel.bind('managers-assigned', (data: { users: any[] }) => {
      setUsers(data.users)
    })

    return () => {
      pusherClient.unsubscribe(`room-${room.code}`)
    }
  }, [room.code])

  const handleAssign = () => {
    startTransitionAssign(async () => {
      await assignManagers(room.id, lang)
    })
  }

  const handleSimulate = () => {
    startTransitionSimulate(async () => {
      await startSimulation(room.id) // Simulation itself does not use lang in prompt right away? Wait, simulateMatch is what is called by startSimulation? No, startSimulation just updates status.
    })
  }

  const formatMoney = (val: number) => `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`

  return (
    <div className="w-full max-w-5xl flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
      
      {!isAssigned ? (
        <Card className="w-full max-w-lg border-none shadow-2xl bg-white/90 backdrop-blur-md">
          <CardHeader className="text-center pb-6 border-b border-slate-100">
            <CardTitle className="text-3xl font-black text-slate-800">{dict.title}</CardTitle>
            <p className="text-slate-500 font-medium">{dict.subtitle}</p>
          </CardHeader>
          <CardContent className="p-8 text-center">
            {currentUser.role === 'admin' ? (
              <Button 
                onClick={handleAssign} 
                isLoading={isPendingAssign}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all text-lg font-bold py-6"
              >
                {!isPendingAssign && <Briefcase className={`w-6 h-6 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} />}
                {isPendingAssign ? dict.revealing : dict.reveal}
              </Button>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-medium">{dict.waitingHost}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-center mb-4">
            <h1 className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{dict.revealTitle}</h1>
            <p className="text-slate-500 text-lg font-medium">{dict.revealSub}</p>
          </div>

          <div className="w-full flex flex-col md:flex-row gap-8 justify-center">
            
            {/* My Manager Card */}
            <div className="flex flex-col items-center space-y-4 animate-in slide-in-from-bottom-8 duration-700 delay-100">
              <h2 className="text-2xl font-bold text-slate-700">{me.name}</h2>
              <div className="flex items-center text-emerald-600 font-black text-xl bg-emerald-50 px-4 py-2 rounded-full shadow-sm">
                <Coins className={`w-5 h-5 ${lang === 'ar' ? 'ml-1' : 'mr-1'}`} /> {formatMoney(me.budgetLeft)} {dict.left}
              </div>
              
              <Card className="w-72 h-96 border-4 border-slate-200 shadow-2xl bg-gradient-to-br from-white to-slate-50 overflow-hidden relative group transform transition-transform hover:scale-105">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-500" />
                <CardContent className="p-6 h-full flex flex-col justify-between items-center text-center">
                  <Briefcase className="w-24 h-24 text-blue-100 mt-4 group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">{parseManager(me.manager).tier} {dict.tier}</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-tight">{parseManager(me.manager).name}</h3>
                  </div>

                  <div className="w-full bg-slate-100 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">{dict.tacticalStyle}</p>
                    <p className="font-semibold text-slate-700 leading-snug">{parseManager(me.manager).tacticalStyle}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="hidden md:flex items-center justify-center font-black text-slate-300 text-5xl italic px-4">
              VS
            </div>

            {/* Opponent Manager Card */}
            <div className="flex flex-col items-center space-y-4 animate-in slide-in-from-bottom-8 duration-700 delay-300">
              <h2 className="text-2xl font-bold text-slate-700">{opponent?.name}</h2>
              <div className="flex items-center text-emerald-600 font-black text-xl bg-emerald-50 px-4 py-2 rounded-full shadow-sm">
                <Coins className={`w-5 h-5 ${lang === 'ar' ? 'ml-1' : 'mr-1'}`} /> {opponent ? formatMoney(opponent.budgetLeft) : '0M'} {dict.left}
              </div>
              
              <Card className="w-72 h-96 border-4 border-slate-200 shadow-2xl bg-gradient-to-br from-white to-slate-50 overflow-hidden relative group transform transition-transform hover:scale-105">
                <div className="absolute top-0 left-0 w-full h-2 bg-rose-500" />
                <CardContent className="p-6 h-full flex flex-col justify-between items-center text-center">
                  <Briefcase className="w-24 h-24 text-rose-100 mt-4 group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">{parseManager(opponent?.manager).tier} {dict.tier}</p>
                    <h3 className="text-3xl font-black text-slate-800 leading-tight">{parseManager(opponent?.manager).name}</h3>
                  </div>

                  <div className="w-full bg-slate-100 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">{dict.tacticalStyle}</p>
                    <p className="font-semibold text-slate-700 leading-snug">{parseManager(opponent?.manager).tacticalStyle}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>

          {currentUser.role === 'admin' ? (
             <Button 
                onClick={handleSimulate} 
                isLoading={isPendingSimulate}
                size="lg"
                className="mt-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 px-12 py-8 text-xl font-black rounded-2xl transition-all hover:scale-105"
              >
                {!isPendingSimulate && <PlayCircle className={`w-8 h-8 ${lang === 'ar' ? 'ml-3' : 'mr-3'}`} />}
                {isPendingSimulate ? dict.simulating : dict.simulate}
              </Button>
          ) : (
            <div className="mt-12 text-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-500 font-bold">{dict.waitingSimulate}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
