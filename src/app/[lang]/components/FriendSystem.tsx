'use client'

import { useState } from 'react'
import { PlusCircle, Check, X, Users, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FriendSystem({ userId, initialFriends, initialRequests }: { userId: string, initialFriends: any[], initialRequests: any[] }) {
  const [targetId, setTargetId] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetId || targetId === userId) return
    setLoading(true)
    await fetch('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetId }),
      headers: { 'Content-Type': 'application/json' }
    })
    setTargetId('')
    setLoading(false)
    router.refresh()
  }

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    setLoading(true)
    await fetch('/api/friends/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, status }),
      headers: { 'Content-Type': 'application/json' }
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddFriend} className="flex gap-2">
        <input 
          type="text" 
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="Enter Friend's ID..." 
          className="flex-1 px-4 py-2 bg-slate-950/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          required
        />
        <button type="submit" disabled={loading} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 flex items-center shadow-lg font-bold">
          <UserPlus size={18} className="mr-2" /> Add
        </button>
      </form>

      {initialRequests.length > 0 && (
        <div className="bg-indigo-950/40 p-4 rounded-2xl border border-indigo-500/30">
          <h4 className="font-black text-indigo-400 text-sm mb-3 uppercase tracking-wider">Incoming Requests</h4>
          <div className="space-y-2">
            {initialRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-indigo-500/20 text-sm">
                <span className="font-bold text-slate-200">{req.sender.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleResponse(req.id, 'accepted')} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors"><Check size={16} /></button>
                  <button onClick={() => handleResponse(req.id, 'rejected')} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-black text-slate-400 text-sm mb-4 flex items-center uppercase tracking-wider"><Users size={16} className="mr-2" /> My Squad (Friends)</h4>
        {initialFriends.length === 0 ? (
          <p className="text-sm text-slate-600 italic">No friends added yet.</p>
        ) : (
          <div className="space-y-2">
            {initialFriends.map(friend => (
              <div key={friend.id} className="flex items-center gap-3 p-3 bg-slate-950/30 hover:bg-slate-800/50 rounded-xl border border-slate-800 transition-all cursor-default">
                {friend.image ? <img src={friend.image} className="w-10 h-10 rounded-full border-2 border-slate-700" /> : <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700" />}
                <span className="text-sm font-bold text-slate-200">{friend.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
