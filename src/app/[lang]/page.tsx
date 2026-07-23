import { getDictionary } from '@/lib/getDictionary'
import { Locale } from '@/i18n.config'
import LobbyForm from './LobbyForm'
import { auth, signIn, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import FriendSystem from './components/FriendSystem'
import GlobalSocketListener from './components/GlobalSocketListener'

import Logo from '@/components/Logo'

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang)
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="mb-12 relative z-10">
          <Logo className="w-24 h-24 scale-150 drop-shadow-2xl" />
        </div>

        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-10 rounded-3xl shadow-2xl shadow-indigo-500/20 max-w-md w-full text-center relative z-10">
          <h1 className="text-4xl font-black mb-2 text-white tracking-tighter">Welcome</h1>
          <p className="text-slate-400 mb-8 font-medium">Log in to build your dream team and challenge your friends.</p>
          <form action={async () => { "use server"; await signIn("google") }}>
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all border border-indigo-400/20 flex justify-center items-center gap-3">
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </form>
        </div>
      </main>
    )
  }

  const userId = session.user.id as string;
  
  const friendships = await prisma.friendRequest.findMany({
    where: { status: 'accepted', OR: [{ senderId: userId }, { receiverId: userId }] },
    include: { sender: true, receiver: true }
  })
  const friends = friendships.map(f => f.senderId === userId ? f.receiver : f.sender)

  const requests = await prisma.friendRequest.findMany({
    where: { status: 'pending', receiverId: userId },
    include: { sender: true }
  })

  const history = await prisma.roomParticipant.findMany({
    where: { userId: userId, room: { status: 'finished' } },
    include: { room: true },
    orderBy: { room: { createdAt: 'desc' } }
  })

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4 lg:p-8">
      <GlobalSocketListener userId={userId} lang={lang} />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12 mt-4">
          <Logo className="w-12 h-12 scale-125 ml-4" />
          <form action={async () => { "use server"; await signOut() }}>
            <button type="submit" className="text-sm text-slate-400 hover:text-red-400 font-bold px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800 transition-colors">Sign Out</button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Profile & Friends */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center space-x-4 relative z-10">
                {session?.user?.image && <img src={session?.user?.image} className="w-16 h-16 rounded-2xl border-2 border-indigo-500/50 shadow-lg" alt="Profile" />}
                <div>
                  <h2 className="font-black text-xl text-white">{session?.user?.name}</h2>
                  <p className="text-xs text-emerald-400 font-mono tracking-wider mt-1" dir="ltr">ID: {userId}</p>
                </div>
              </div>
            </div>

            {/* Friends Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl">
              <FriendSystem userId={userId} initialFriends={friends} initialRequests={requests} />
            </div>
          </div>

          {/* Main Area: Lobby & History */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-indigo-500/5">
              <LobbyForm lang={lang} dict={dict.lobby} />
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl">
              <h3 className="font-black text-xl mb-6 text-white uppercase tracking-wider">Match History</h3>
              {history.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/30 rounded-2xl border border-slate-800/50">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No matches played yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map(record => (
                    <div key={record.id} className="p-5 bg-slate-950/50 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 transition-all flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-300">Room <span className="text-indigo-400 font-mono text-lg ml-1">{record.room.code}</span></p>
                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">{record.role}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-4 py-2 bg-slate-800/80 text-slate-300 text-xs rounded-xl font-bold uppercase tracking-wider">{record.room.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
