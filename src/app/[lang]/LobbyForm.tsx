'use client'

import { useState, useTransition } from 'react'
import { createRoom, joinRoom } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Users, Zap } from 'lucide-react'

export default function LobbyForm({ lang, dict }: { lang: string, dict: any }) {
  const router = useRouter()
  const [isPendingCreate, startTransitionCreate] = useTransition()
  const [isPendingJoin, startTransitionJoin] = useTransition()
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')

  const handleCreate = (formData: FormData) => {
    startTransitionCreate(async () => {
      await createRoom(lang, formData)
    })
  }

  const handleJoin = (formData: FormData) => {
    startTransitionJoin(async () => {
      await joinRoom(lang, formData)
    })
  }

  return (
    <div className="w-full max-w-md mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Tabs Header */}
      <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800 mb-6 relative z-10">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Trophy size={18} />
          {dict.hostRoom || dict.createTitle || "Create Room"}
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'join'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users size={18} />
          {dict.joinRoom || dict.joinTitle || "Join Room"}
        </button>
      </div>

      <div className="relative overflow-hidden group">
        {/* Create Match Tab */}
        {activeTab === 'create' && (
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-indigo-500/20 shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors pointer-events-none" />
            <form action={handleCreate} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <Label htmlFor="format" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.format || "Format"}</Label>
                <select id="format" name="format" className="flex h-12 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option value="5" className="bg-slate-900 text-white">5-a-side (Fast)</option>
                  <option value="11" className="bg-slate-900 text-white">11-a-side (Full Match)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.difficulty || "Difficulty"}</Label>
                <select id="difficulty" name="difficulty" className="flex h-12 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option value="easy" className="bg-slate-900 text-emerald-400">{dict.difficultyEasy || "Easy"}</option>
                  <option value="normal" className="bg-slate-900 text-blue-400">{dict.difficultyNormal || "Normal"}</option>
                  <option value="hard" className="bg-slate-900 text-orange-400">{dict.difficultyHard || "Hard"}</option>
                  <option value="veryHard" className="bg-slate-900 text-red-400">{dict.difficultyVeryHard || "Very Hard"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.budget || "Budget (Millions)"}</Label>
                <Input id="budget" name="budget" type="number" defaultValue="100" min="50" max="500" className="bg-slate-950/50 border-slate-700 text-white focus:ring-indigo-500 focus:border-transparent rounded-xl h-12 text-lg font-bold" />
              </div>
              <Button type="submit" isLoading={isPendingCreate} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all mt-4">
                <Zap className={`w-4 h-4 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.createRoom || "Create Match"}
              </Button>
            </form>
          </div>
        )}

        {/* Join Match Tab */}
        {activeTab === 'join' && (
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-emerald-500/20 shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-600/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors pointer-events-none" />
            <form action={handleJoin} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-slate-300 font-bold uppercase tracking-wider text-xs">{dict.roomCode}</Label>
                <Input id="code" name="code" required placeholder={dict.codePlaceholder || "Ex: A1B2C3"} className="uppercase bg-slate-950/50 border-slate-700 text-white focus:ring-emerald-500 focus:border-transparent rounded-xl h-14 text-center text-2xl font-black tracking-widest" maxLength={6} />
              </div>
              <div className="pt-2">
                <Button type="submit" isLoading={isPendingJoin} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                  <Zap className={`w-4 h-4 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.joinGame || "Join Match"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
