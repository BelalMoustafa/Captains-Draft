import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { requestId, status } = await req.json()

  try {
    const request = await prisma.friendRequest.findUnique({ where: { id: requestId } })
    if (!request || request.receiverId !== session.user.id) {
      return new NextResponse('Not found or unauthorized', { status: 404 })
    }

    if (status === 'accepted') {
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' }
      })
    } else {
      await prisma.friendRequest.delete({ where: { id: requestId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
  }
}
