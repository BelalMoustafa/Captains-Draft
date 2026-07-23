'use client'

import { useState, useTransition } from 'react'
import { createRoom, joinRoom } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Users, Zap } from 'lucide-react'

export default function LobbyForm({ lang, dict, userId }: { lang: string, dict: any, userId?: string }) {
  const router = useRouter()
  const [isPendingCreate, startTransitionCreate] = useTransition()
  const [isPendingJoin, startTransitionJoin] = useTransition()

  const handleCreate = (formData: FormData) => {
    if (userId) formData.append('userId', userId)
    startTransitionCreate(async () => {
      await createRoom(lang, formData)
    })
  }

  const handleJoin = (formData: FormData) => {
    if (userId) formData.append('userId', userId)
    startTransitionJoin(async () => {
      await joinRoom(lang, formData)
    })
  }

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 text-left" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Create Room */}
      <div className="flex-1 bg-slate-900/40 p-6 rounded-2xl border border-indigo-500/20 shadow-lg relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors" />
        <h2 className="text-2xl font-black mb-6 flex items-center text-white tracking-tight">
          <Trophy className={`w-6 h-6 text-indigo-400 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
          {dict.hostRoom || dict.createTitle || "Create Room"}
        </h2>
        <form action={handleCreate} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <Label htmlFor="nameCreate" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.yourName}</Label>
            <Input id="nameCreate" name="name" required placeholder={dict.namePlaceholder || dict.yourName} className="bg-slate-950/50 border-slate-700 text-white focus:ring-indigo-500 focus:border-transparent rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="format" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.format || "Format"}</Label>
            <select id="format" name="format" className="flex h-12 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="5" className="bg-slate-900 text-white">5-a-side (Fast)</option>
              <option value="11" className="bg-slate-900 text-white">11-a-side (Full Match)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.difficulty || "Difficulty"}</Label>
            <select id="difficulty" name="difficulty" className="flex h-12 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="easy" className="bg-slate-900">{dict.difficultyEasy || "Easy"}</option>
              <option value="normal" className="bg-slate-900">{dict.difficultyNormal || "Normal"}</option>
              <option value="hard" className="bg-slate-900">{dict.difficultyHard || "Hard"}</option>
              <option value="veryHard" className="bg-slate-900">{dict.difficultyVeryHard || "Very Hard"}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.budget || "Budget"}</Label>
            <Input id="budget" name="budget" type="number" defaultValue="100" min="50" max="500" className="bg-slate-950/50 border-slate-700 text-white focus:ring-indigo-500 focus:border-transparent rounded-xl h-12" />
          </div>
          <Button type="submit" isLoading={isPendingCreate} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
            <Zap className={`w-4 h-4 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.createRoom || "Create"}
          </Button>
        </form>
      </div>

      <div className="hidden md:flex flex-col justify-center items-center">
        <div className="w-px h-24 bg-slate-800" />
        <span className="py-2 text-slate-500 font-bold uppercase tracking-widest text-xs">OR</span>
        <div className="w-px h-24 bg-slate-800" />
      </div>

      {/* Join Room */}
      <div className="flex-1 bg-slate-900/40 p-6 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden group">
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-600/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors" />
        <h2 className="text-2xl font-black mb-6 flex items-center text-white tracking-tight">
          <Users className={`w-6 h-6 text-emerald-400 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
          {dict.joinRoom || dict.joinTitle || "Join Room"}
        </h2>
        <form action={handleJoin} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <Label htmlFor="nameJoin" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.yourName}</Label>
            <Input id="nameJoin" name="name" required placeholder={dict.namePlaceholder || dict.yourName} className="bg-slate-950/50 border-slate-700 text-white focus:ring-emerald-500 focus:border-transparent rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.roomCode}</Label>
            <Input id="code" name="code" required placeholder={dict.codePlaceholder || "Ex: A1B2C3"} className="uppercase bg-slate-950/50 border-slate-700 text-white focus:ring-emerald-500 focus:border-transparent rounded-xl h-12" />
          </div>
          <div className="pt-2">
            <Button type="submit" isLoading={isPendingJoin} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
              <Zap className={`w-4 h-4 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.joinGame || "Join"}
            </Button>
          </div>
        </form>
      </div>

    </div>
  )
}
