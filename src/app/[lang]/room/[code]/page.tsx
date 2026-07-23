import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import RoomClient from './RoomClient'
import { getDictionary } from '@/lib/getDictionary'
import { Locale } from '@/i18n.config'
import { auth } from '@/auth'

export default async function RoomPage({ params }: { params: Promise<{ lang: Locale, code: string }> }) {
  const { lang, code } = await params
  const session = await auth()
  
  if (!session?.user?.id) redirect(`/${lang}`)

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { participants: true }
  })

  if (!room) redirect(`/${lang}`)

  const cookieStore = await cookies()
  const participantId = cookieStore.get('userId')?.value // Note: This is RoomParticipant.id, not User.id!

  if (!participantId) redirect(`/${lang}`)

  const currentUser = room.participants.find(u => u.id === participantId)
  if (!currentUser) redirect(`/${lang}`)

  // Fetch friends for invitations
  const userId = session.user!.id!
  const friendships = await prisma.friendRequest.findMany({
    where: { status: 'accepted', OR: [{ senderId: userId }, { receiverId: userId }] },
    include: { sender: true, receiver: true }
  })
  const friends = friendships.map(f => f.senderId === userId ? f.receiver : f.sender)

  const dict = await getDictionary(lang)

  const serializedRoom = {
    ...room,
    createdAt: room.createdAt.toISOString()
  }

  return (
    <RoomClient 
      room={serializedRoom} 
      users={room.participants} 
      currentUser={currentUser} 
      friends={friends}
      lang={lang}
      dict={dict}
    />
  )
}
