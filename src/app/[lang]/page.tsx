import { getDictionary } from '@/lib/getDictionary'
import { Locale } from '@/i18n.config'
import LobbyForm from './LobbyForm'
import { auth, signIn, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import FriendSystem from './components/FriendSystem'

import Logo from '@/components/Logo'

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang)
  const session = await auth()

  let friends: any[] = []
  let requests: any[] = []
  let history: any[] = []

  if (session?.user?.id) {
    const userId = session.user.id as string;
    const friendships = await prisma.friendRequest.findMany({
      where: { status: 'accepted', OR: [{ senderId: userId }, { receiverId: userId }] },
      include: { sender: true, receiver: true }
    })
    friends = friendships.map(f => f.senderId === userId ? f.receiver : f.sender)

    requests = await prisma.friendRequest.findMany({
      where: { status: 'pending', receiverId: userId },
      include: { sender: true }
    })

    history = await prisma.roomParticipant.findMany({
      where: { userId: userId, room: { status: 'finished' } },
      include: { room: true }
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-4">
      <div className="absolute top-6">
        <Logo className="w-16 h-16 scale-150" />
      </div>

      {!session ? (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-md w-full text-center mt-20">
          <h1 className="text-3xl font-black mb-6 text-white tracking-tighter">Welcome</h1>
          <form action={async () => { "use server"; await signIn("google") }}>
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all border border-indigo-400/20">
              Sign in with Google
            </button>
          </form>
          <div className="mt-8 border-t border-slate-800 pt-6">
            <p className="text-sm text-slate-400 mb-4 font-medium uppercase tracking-widest">Or play as guest</p>
            <LobbyForm lang={lang} dict={dict.lobby} />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 mt-24">
          <div className="lg:col-span-1 space-y-8">
            {/* Profile Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl shadow-emerald-500/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center space-x-4 mb-6 relative z-10">
                {session?.user?.image && <img src={session?.user?.image} className="w-16 h-16 rounded-2xl border-2 border-indigo-500/50 shadow-lg" alt="Profile" />}
                <div>
                  <h2 className="font-black text-xl text-white">{session?.user?.name}</h2>
                  <p className="text-xs text-emerald-400 font-mono tracking-wider mt-1" dir="ltr">ID: {session?.user?.id}</p>
                </div>
              </div>
              <form action={async () => { "use server"; await signOut() }}>
                <button type="submit" className="text-sm text-slate-400 hover:text-red-400 font-bold w-full text-center py-3 bg-slate-950/50 rounded-xl transition-colors border border-slate-800/50 hover:border-red-500/30">Sign Out</button>
              </form>
            </div>

            {/* Friends Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl">
              <FriendSystem userId={session?.user?.id as string} initialFriends={friends} initialRequests={requests} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-indigo-500/10">
              <LobbyForm lang={lang} dict={dict.lobby} userId={session?.user?.id as string} />
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl">
              <h3 className="font-black text-xl mb-4 text-white uppercase tracking-wider">Match History</h3>
              {history.length === 0 ? (
                <p className="text-slate-500 text-sm">No matches played yet.</p>
              ) : (
                <div className="space-y-4">
                  {history.map(record => (
                    <div key={record.id} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-indigo-500/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-300">Room: <span className="text-indigo-400 font-mono">{record.room.code}</span></p>
                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">{record.role}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full font-semibold">{record.room.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
