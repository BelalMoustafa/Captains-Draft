'use client'

import { useEffect, useState } from 'react'
import { socketClient } from '@/lib/socket-client'
import { useRouter } from 'next/navigation'
import { Check, X, Bell } from 'lucide-react'

export default function GlobalSocketListener({ userId, lang }: { userId: string, lang: string }) {
  const [invite, setInvite] = useState<{ senderName: string, roomCode: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    socketClient.emit('register-user', userId)

    socketClient.on('receive-invite', (data: { senderName: string, roomCode: string }) => {
      setInvite(data)
      // Auto-hide after 15 seconds
      setTimeout(() => setInvite(null), 15000)
    })

    return () => {
      socketClient.off('receive-invite')
    }
  }, [userId])

  if (!invite) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 max-w-sm w-full">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
            <Bell size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">Match Invitation</h4>
            <p className="text-slate-400 text-xs mt-1">
              <span className="font-bold text-indigo-400">{invite.senderName}</span> invited you to join a match!
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setInvite(null)}
            className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-bold transition-colors flex items-center justify-center gap-1"
          >
            <X size={16} /> Decline
          </button>
          <button
            onClick={() => {
              setInvite(null)
              router.push(`/${lang}/room/${invite.roomCode}`)
            }}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-1"
          >
            <Check size={16} /> Join Now
          </button>
        </div>
      </div>
    </div>
  )
}
