import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { targetId } = await req.json()
  if (!targetId || targetId === session.user.id) return new NextResponse('Invalid target', { status: 400 })

  try {
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: targetId },
          { senderId: targetId, receiverId: session.user.id }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ success: true, message: 'Request already exists' })
    }

    await prisma.friendRequest.create({
      data: { senderId: session.user.id, receiverId: targetId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
  }
}
