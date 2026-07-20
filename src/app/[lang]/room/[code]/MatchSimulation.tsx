'use client'

import { useState, useEffect, useTransition } from 'react'
import { simulateMatch } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { pusherClient } from '@/lib/pusher-client'
import { Loader2, Trophy, Target, FileText, Home } from 'lucide-react'
import Link from 'next/link'

export default function MatchSimulation({ room, currentUser, users, lang, dict }: any) {
  const [result, setResult] = useState<any>(JSON.parse(room.settings).matchResult || null)
  const [isPending, startTransition] = useTransition()

  const players = users.filter((u: any) => u.role !== 'spectator')
  const user1 = players[0]
  const user2 = players[1]

  const parseManager = (managerStr: string) => {
    if (!managerStr || managerStr === "null") return { name: "Pending", tier: "Pending", tacticalStyle: "Pending" }
    try { return JSON.parse(managerStr) } catch { return { name: "Error", tier: "Error", tacticalStyle: "Error" } }
  }

  useEffect(() => {
    const channel = pusherClient.subscribe(`room-${room.code}`)
    
    channel.bind('match-simulated', (data: { result: any }) => {
      setResult(data.result)
    })

    return () => {
      pusherClient.unsubscribe(`room-${room.code}`)
    }
  }, [room.code])

  const handleSimulate = () => {
    startTransition(async () => {
      await simulateMatch(room.id, lang)
    })
  }

  if (!result) {
    return (
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
        <Card className="w-full border-none shadow-2xl bg-white/90 backdrop-blur-md">
          <CardContent className="p-12 text-center space-y-6">
            <Trophy className="w-24 h-24 text-amber-500 mx-auto animate-pulse" />
            <h2 className="text-4xl font-black text-slate-800">{dict.ultimateShowdown}</h2>
            <p className="text-slate-500 text-lg">
              {dict.analyzing}
            </p>
            
            {currentUser.role === 'admin' ? (
              <Button 
                onClick={handleSimulate} 
                isLoading={isPending}
                size="lg"
                className="mt-6 bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-200 px-12 py-8 text-2xl font-black rounded-2xl transition-all hover:scale-105"
              >
                {!isPending && <Target className={`w-8 h-8 ${lang === 'ar' ? 'ml-3' : 'mr-3'}`} />}
                {isPending ? dict.simulatingEngine : dict.runSimulation}
              </Button>
            ) : (
              <div className="mt-8">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
                <p className="text-slate-500 font-bold mt-4">{dict.waitingHostStartSimulation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl flex flex-col items-center space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase drop-shadow-sm">{dict.fullTimeResult}</h1>
        <p className="text-xl font-bold text-slate-500">{dict.simulatedBy}</p>
      </div>

      {/* Scoreboard */}
      <Card className="w-full border-none shadow-2xl bg-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500" />
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-center justify-between">
            
            {/* Team 1 */}
            <div className={`flex-1 p-12 text-center flex flex-col items-center justify-center space-y-4 ${result.winner === user1.name ? 'bg-amber-50/50' : ''}`}>
              <h2 className="text-4xl font-black text-slate-800">{user1.name}</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{parseManager(user1.manager).name}</p>
            </div>

            {/* Score */}
            <div className={`flex-shrink-0 bg-slate-900 text-white px-12 py-8 rounded-b-3xl md:rounded-b-none md:rounded-bl-3xl md:rounded-br-3xl shadow-2xl z-10 flex items-center justify-center space-x-6 transform -translate-y-4 md:translate-y-0 ${lang === 'ar' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <span className="text-7xl font-black">{result.team1Goals}</span>
              <span className="text-3xl font-bold text-slate-500">-</span>
              <span className="text-7xl font-black">{result.team2Goals}</span>
            </div>

            {/* Team 2 */}
            <div className={`flex-1 p-12 text-center flex flex-col items-center justify-center space-y-4 ${result.winner === user2.name ? 'bg-amber-50/50' : ''}`}>
              <h2 className="text-4xl font-black text-slate-800">{user2.name}</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{parseManager(user2.manager).name}</p>
            </div>

          </div>
          
          {/* Winner Banner */}
          <div className="w-full bg-slate-50 py-4 border-t border-slate-100 text-center">
            {result.winner === 'Draw' ? (
              <span className="text-2xl font-black text-slate-600 uppercase tracking-widest">{dict.draw}</span>
            ) : (
              <span className="text-2xl font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center">
                <Trophy className={`w-6 h-6 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {result.winner} {dict.winsDraft}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Goalscorers */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <CardTitle className="text-xl font-black text-slate-700 flex items-center">
              <Target className={`w-5 h-5 text-rose-500 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.goalscorers}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              {result.goalscorers?.length > 0 ? (
                result.goalscorers.map((scorer: string, idx: number) => (
                  <li key={idx} className="flex items-center text-slate-700 font-bold text-lg">
                    <span className={`w-2 h-2 bg-rose-500 rounded-full ${lang === 'ar' ? 'ml-3' : 'mr-3'}`} />
                    {scorer}
                  </li>
                ))
              ) : (
                <li className="text-slate-500 font-medium italic">{dict.noGoals}</li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Tactical Analysis */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black text-indigo-900 flex items-center">
              <FileText className={`w-5 h-5 text-indigo-600 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.tacticalAnalysis}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-indigo-950/80 leading-relaxed font-medium text-lg">
              {result.tacticalAnalysis}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Play Again Button */}
      <Link href={`/${lang}`}>
        <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-12 py-8 text-xl font-bold rounded-2xl shadow-xl transition-all hover:scale-105">
          <Home className={`w-6 h-6 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.returnHome}
        </Button>
      </Link>

    </div>
  )
}
