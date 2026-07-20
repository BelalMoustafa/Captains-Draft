'use server'

import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function createRoom(lang: string, formData: FormData) {
  let code = ''
  try {
    const name = formData.get('name') as string
    const format = parseInt(formData.get('format') as string, 10)
    const budget = parseInt(formData.get('budget') as string, 10)

    if (!name || isNaN(format) || isNaN(budget)) throw new Error('Invalid input')

    code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const room = await prisma.room.create({
      data: {
        code,
        settings: JSON.stringify({ format, budget }),
      }
    })

    const user = await prisma.user.create({
      data: {
        roomId: room.id,
        name,
        role: 'admin',
        budgetLeft: budget,
        squad: JSON.stringify([]),
      }
    })

    const cookieStore = await cookies()
    cookieStore.set('userId', user.id)
  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN CREATEROOM:", error)
    throw error
  }

  redirect(`/${lang}/room/${code}`)
}

export async function joinRoom(lang: string, formData: FormData) {
  let finalCode = ''
  try {
    const name = formData.get('name') as string
    const code = formData.get('code') as string

    if (!name || !code) throw new Error('Name and code are required')

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { users: true }
    })

    if (!room) throw new Error('Room not found')
    if (room.users.length >= 2) throw new Error('Room is full')
    if (room.status !== 'waiting') throw new Error('Game already started')

    const settings = JSON.parse(room.settings)

    const user = await prisma.user.create({
      data: {
        roomId: room.id,
        name,
        role: 'player',
        budgetLeft: settings.budget,
        squad: JSON.stringify([]),
      }
    })

    const cookieStore = await cookies()
    cookieStore.set('userId', user.id)

    await pusherServer.trigger(`room-${room.code}`, 'player-joined', {
      user: { id: user.id, name: user.name, role: user.role }
    })
    
    finalCode = room.code
  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN JOINROOM:", error)
    throw error
  }

  redirect(`/${lang}/room/${finalCode}`)
}

export async function startRps(roomId: string) {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: { status: 'rps' }
  })
  
  await pusherServer.trigger(`room-${room.code}`, 'room-updated', { status: 'rps' })
}

export async function submitRpsChoice(roomId: string, userId: string, choice: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  
  const settings = JSON.parse(room.settings)
  if (!settings.rps) settings.rps = {}
  
  settings.rps[userId] = choice
  const userIds = Object.keys(settings.rps)
  
  if (userIds.length === 2) {
    const [id1, id2] = userIds
    const choice1 = settings.rps[id1]
    const choice2 = settings.rps[id2]
    
    if (choice1 === choice2) {
      settings.rps = {}
      await prisma.room.update({
        where: { id: roomId },
        data: { settings: JSON.stringify(settings) }
      })
      await pusherServer.trigger(`room-${room.code}`, 'rps-result', { type: 'tie' })
      return
    }
    
    let winnerId = null
    if (
      (choice1 === 'rock' && choice2 === 'scissors') ||
      (choice1 === 'paper' && choice2 === 'rock') ||
      (choice1 === 'scissors' && choice2 === 'paper')
    ) {
      winnerId = id1
    } else {
      winnerId = id2
    }
    
    settings.firstTurnId = winnerId
    delete settings.rps 
    
    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'drafting', settings: JSON.stringify(settings) }
    })
    
    await pusherServer.trigger(`room-${room.code}`, 'rps-result', { type: 'win', winnerId })
  } else {
    await prisma.room.update({
      where: { id: roomId },
      data: { settings: JSON.stringify(settings) }
    })
    await pusherServer.trigger(`room-${room.code}`, 'rps-choice-submitted', { userId })
  }
}

export async function generateDraftPool(roomId: string, lang: string = 'en') {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  
  const settings = JSON.parse(room.settings)
  
  const prompt = `Generate a draft pool for a ${settings.format}-a-side football game. Return a JSON array of objects. Each object must contain 'round', 'visiblePlayer' (name, position, club, rating), and 'hiddenPlayer' (name, position, club, rating). Use a mix of top-tier, mid-tier, and retired legends from top 5 European leagues and Egyptian Premier League. Do not output anything other than valid JSON. Generate the response strictly in ${lang === 'ar' ? 'Arabic' : 'English'}.`
  
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash", generationConfig: { responseMimeType: "application/json" } })
  const result = await model.generateContent(prompt)
  const response = result.response.text()
  
  const draftPool = JSON.parse(response)
  
  const finalizedPool = draftPool.slice(0, settings.format).map((p: any, i: number) => ({ ...p, round: i + 1 }))
  
  settings.draftPool = finalizedPool
  settings.currentRound = 0
  settings.bidding = {
    currentBid: 0,
    currentBidderId: null,
    turnId: settings.firstTurnId
  }
  
  await prisma.room.update({
    where: { id: roomId },
    data: { settings: JSON.stringify(settings) }
  })
  
  await pusherServer.trigger(`room-${room.code}`, 'draft-pool-generated', { settings })
}

export async function placeBid(roomId: string, userId: string, amount: number) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: true } })
  if (!room) throw new Error('Room not found')
  
  const user = room.users.find(u => u.id === userId)
  if (!user) throw new Error('User not found')
  if (user.budgetLeft < amount) throw new Error('Insufficient budget')
  
  const settings = JSON.parse(room.settings)
  if (settings.bidding.turnId !== userId) throw new Error('Not your turn')
  if (amount <= settings.bidding.currentBid) throw new Error('Bid must be higher than current bid')
  
  const opponent = room.users.find(u => u.id !== userId)
  
  settings.bidding.currentBid = amount
  settings.bidding.currentBidderId = userId
  settings.bidding.turnId = opponent?.id
  
  await prisma.room.update({
    where: { id: roomId },
    data: { settings: JSON.stringify(settings) }
  })
  
  await pusherServer.trigger(`room-${room.code}`, 'bid-updated', { bidding: settings.bidding })
}

export async function foldBid(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: true } })
  if (!room) throw new Error('Room not found')
  
  const settings = JSON.parse(room.settings)
  if (settings.bidding.turnId !== userId) throw new Error('Not your turn')
  
  const opponent = room.users.find(u => u.id !== userId)
  const folder = room.users.find(u => u.id === userId)
  
  if (!opponent || !folder) throw new Error('Players not found')
  
  const currentRoundIndex = settings.currentRound
  const roundData = settings.draftPool[currentRoundIndex]
  
  const winPrice = settings.bidding.currentBid > 0 ? settings.bidding.currentBid : 0
  
  const opponentSquad = JSON.parse(opponent.squad)
  opponentSquad.push(roundData.visiblePlayer)
  const opponentNewBudget = opponent.budgetLeft - winPrice
  
  const folderSquad = JSON.parse(folder.squad)
  folderSquad.push(roundData.hiddenPlayer)
  const folderNewBudget = folder.budgetLeft
  
  await prisma.$transaction([
    prisma.user.update({ where: { id: opponent.id }, data: { squad: JSON.stringify(opponentSquad), budgetLeft: opponentNewBudget } }),
    prisma.user.update({ where: { id: folder.id }, data: { squad: JSON.stringify(folderSquad), budgetLeft: folderNewBudget } })
  ])
  
  settings.currentRound += 1
  
  let newStatus = room.status
  if (settings.currentRound >= settings.format) {
    newStatus = 'manager-assignment'
  } else {
    settings.bidding = {
      currentBid: 0,
      currentBidderId: null,
      turnId: folder.id 
    }
  }
  
  await prisma.room.update({
    where: { id: roomId },
    data: { status: newStatus, settings: JSON.stringify(settings) }
  })
  
  const updatedRoom = await prisma.room.findUnique({ where: { id: roomId }, include: { users: true } })
  
  await pusherServer.trigger(`room-${room.code}`, 'round-resolved', { 
    settings, 
    status: newStatus,
    users: updatedRoom?.users
  })
}

export async function assignManagers(roomId: string, lang: string = 'en') {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: true } })
  if (!room) throw new Error('Room not found')
  
  const user1 = room.users[0]
  const user2 = room.users[1]
  
  if (user1.manager && user2.manager) return
  
  const prompt = `You are a football expert. Based on the remaining budget of Player 1 (Budget: ${user1.budgetLeft}M) and Player 2 (Budget: ${user2.budgetLeft}M), assign a real-life football manager to each. High budget (e.g., >30M) = Elite manager (e.g., Guardiola, Ancelotti). Medium/Low budget = Mid-tier or local manager. Return STRICTLY valid JSON with this structure: { "player1Manager": { "name": "...", "tacticalStyle": "...", "tier": "..." }, "player2Manager": { "name": "...", "tacticalStyle": "...", "tier": "..." } }. Generate the response strictly in ${lang === 'ar' ? 'Arabic' : 'English'}.`
  
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash", generationConfig: { responseMimeType: "application/json" } })
  const result = await model.generateContent(prompt)
  const response = JSON.parse(result.response.text())
  
  const [updatedUser1, updatedUser2] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user1.id },
      data: { manager: JSON.stringify(response.player1Manager) }
    }),
    prisma.user.update({
      where: { id: user2.id },
      data: { manager: JSON.stringify(response.player2Manager) }
    })
  ])
  
  await pusherServer.trigger(`room-${room.code}`, 'managers-assigned', {
    users: [updatedUser1, updatedUser2]
  })
}

export async function startSimulation(roomId: string) {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: { status: 'simulation' }
  })
  await pusherServer.trigger(`room-${room.code}`, 'room-updated', { status: 'simulation' })
}

export async function simulateMatch(roomId: string, lang: string = 'en') {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: true } })
  if (!room) throw new Error('Room not found')
  
  const user1 = room.users[0]
  const user2 = room.users[1]
  
  const settings = JSON.parse(room.settings)
  if (settings.matchResult) return // Already simulated
  
  const prompt = `Act as an elite football analyst. Evaluate Team 1 vs Team 2. Deeply analyze their tactical formations, defensive structures, and overall squad playstyles under their respective managers. Calculate a realistic match outcome based on these factors (e.g., a team with weak defensive structures will concede goals). Return STRICTLY valid JSON: { "team1Goals": number, "team2Goals": number, "winner": "Player Name or Draw", "goalscorers": ["Player A (12')", "Player B (89')"], "tacticalAnalysis": "A rich 4-sentence breakdown of how the tactical formations and manager playstyles decided the game." }
  
Team 1 (${user1.name}):
Manager: ${user1.manager}
Squad: ${user1.squad}

Team 2 (${user2.name}):
Manager: ${user2.manager}
Squad: ${user2.squad}

Remember: Team 1 is ${user1.name} and Team 2 is ${user2.name}. Winner should be exactly '${user1.name}', '${user2.name}', or 'Draw'. Generate the response strictly in ${lang === 'ar' ? 'Arabic' : 'English'}.`

  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash", generationConfig: { responseMimeType: "application/json" } })
  const result = await model.generateContent(prompt)
  const response = JSON.parse(result.response.text())
  
  settings.matchResult = response
  
  await prisma.room.update({
    where: { id: roomId },
    data: { settings: JSON.stringify(settings) }
  })
  
  await pusherServer.trigger(`room-${room.code}`, 'match-simulated', { result: response })
}
