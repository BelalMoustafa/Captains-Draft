'use client'

import { useTransition } from 'react'
import { createRoom, joinRoom } from '@/app/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Users } from 'lucide-react'

export default function LobbyForm({ lang, dict }: { lang: string, dict: any }) {
  const [isPendingCreate, startTransitionCreate] = useTransition()
  const [isPendingJoin, startTransitionJoin] = useTransition()

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
    <>
      <div className="text-center mb-12 space-y-4">
        <Trophy className="w-20 h-20 text-amber-500 mx-auto drop-shadow-md" />
        <h1 className="text-6xl font-black text-slate-800 tracking-tighter">{dict.title}</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        <Card className="flex-1 border-none shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center text-slate-800">
              <Trophy className={`w-6 h-6 text-blue-500 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.hostRoom}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="create-name" className="text-slate-600 font-semibold">{dict.yourName}</Label>
                <Input id="create-name" name="name" placeholder={dict.namePlaceholder} required className="bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="format" className="text-slate-600 font-semibold">{dict.format}</Label>
                <select id="format" name="format" className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" required>
                  <option value="5">5-a-side</option>
                  <option value="11">11-a-side</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-slate-600 font-semibold">{dict.budget}</Label>
                <Input id="budget" name="budget" type="number" defaultValue="100" min="50" max="500" required className="bg-slate-50 border-slate-200" />
              </div>
              <Button type="submit" isLoading={isPendingCreate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg shadow-lg shadow-blue-200 transition-all active:scale-95">
                {isPendingCreate ? dict.creating : dict.createRoom}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="flex-1 border-none shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center text-slate-800">
              <Users className={`w-6 h-6 text-emerald-500 ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} /> {dict.joinRoom}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="join-name" className="text-slate-600 font-semibold">{dict.yourName}</Label>
                <Input id="join-name" name="name" placeholder={dict.namePlaceholder} required className="bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-slate-600 font-semibold">{dict.roomCode}</Label>
                <Input id="code" name="code" placeholder={dict.codePlaceholder} required className="bg-slate-50 border-slate-200 uppercase" />
              </div>
              <Button type="submit" isLoading={isPendingJoin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-lg shadow-lg shadow-emerald-200 transition-all active:scale-95">
                {isPendingJoin ? dict.joining : dict.joinGame}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
