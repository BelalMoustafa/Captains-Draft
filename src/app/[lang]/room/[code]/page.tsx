import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import RoomClient from './RoomClient'
import { getDictionary } from '@/lib/getDictionary'
import { Locale } from '@/i18n.config'

export default async function RoomPage({ params }: { params: Promise<{ lang: Locale, code: string }> }) {
  const { lang, code } = await params
  
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { participants: true }
  })

  if (!room) redirect('/')

  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value

  if (!userId) redirect('/')

  const currentUser = room.participants.find(u => u.id === userId)
  if (!currentUser) redirect('/')

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
      lang={lang}
      dict={dict}
    />
  )
}
