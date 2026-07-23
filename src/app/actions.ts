'use server'

import { prisma } from '@/lib/prisma'
import { socketServer } from '@/lib/socket-server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function generateJsonWithRetry(prompt: string, maxRetries = 4) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Captains Draft",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      let text = result.choices[0].message.content;
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      return JSON.parse(text);
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      console.warn(`[OpenRouter API] Error (${error.message}). Retrying attempt ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(2, i)));
    }
  }
  throw new Error("Failed to generate valid JSON after retries");
}

export async function createRoom(lang: string, formData: FormData) {
  let code = ''
  try {
    const session = await import('@/auth').then(m => m.auth())
    if (!session?.user?.id) throw new Error('Must be logged in')
    const name = session.user.name || 'Player'
    const format = parseInt(formData.get('format') as string, 10)
    const budgetInput = parseInt(formData.get('budget') as string, 10)
    const difficulty = formData.get('difficulty') as string || 'normal'
    const budget = budgetInput * 1000000 // Convert to actual number value

    if (isNaN(format) || isNaN(budget)) throw new Error('Invalid input')

    code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const room = await prisma.room.create({
      data: {
        code,
        settings: JSON.stringify({ format, budget, difficulty }),
      }
    })

    const userIdStr = session.user.id
    
    const user = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: userIdStr || null,
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
    const session = await import('@/auth').then(m => m.auth())
    if (!session?.user?.id) throw new Error('Must be logged in')
    const name = session.user.name || 'Player'
    const code = formData.get('code') as string

    if (!code) throw new Error('Code is required')

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { participants: true }
    })

    if (!room) throw new Error('Room not found')
    
    let role = 'player'
    const playersCount = room.participants.filter((u: any) => u.role !== 'spectator').length
    
    if (playersCount >= 2 || room.status !== 'waiting') {
      role = 'spectator'
    }

    const settings = JSON.parse(room.settings)

    const userIdStr = session.user.id

    const user = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: userIdStr,
        name,
        role,
        budgetLeft: settings.budget,
        squad: JSON.stringify([]),
      }
    })

    const cookieStore = await cookies()
    cookieStore.set('userId', user.id)

    await socketServer.trigger(`room-${room.code}`, 'player-joined', {
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
  
  await socketServer.trigger(`room-${room.code}`, 'room-updated', { status: 'rps' })
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
      await socketServer.trigger(`room-${room.code}`, 'rps-result', { type: 'tie' })
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
    
    await socketServer.trigger(`room-${room.code}`, 'rps-result', { type: 'win', winnerId })
  } else {
    await prisma.room.update({
      where: { id: roomId },
      data: { settings: JSON.stringify(settings) }
    })
    await socketServer.trigger(`room-${room.code}`, 'rps-choice-submitted', { userId })
  }
}

export async function generateDraftPool(roomId: string, lang: string = 'en') {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw new Error('Room not found')
  
  const settings = JSON.parse(room.settings)
  
  const difficultyStr = settings.difficulty === 'veryHard' ? "EXTREMELY DIFFICULT and obscure players, deep cuts from history" :
                        settings.difficulty === 'hard' ? "hard to guess players, mix of obscure current players and legends" :
                        settings.difficulty === 'medium' ? "average difficulty players, mix of stars and average players" :
                        "very famous, easy to guess top-tier players and legends";

  const formationRequirements = settings.format === 5 
    ? "The squad MUST exactly contain 5 rounds with these positions: 1 GK, 1 DEF, 2 MID, 1 ATT."
    : "The squad MUST exactly contain 11 rounds with these positions: 1 GK, 4 DEF (1 LB, 1 RB, 2 CB), 3 MID, 3 ATT (1 LW, 1 RW, 1 ST).";

  const prompt = `Generate a draft pool for a ${settings.format}-a-side football game. Return a JSON array of exactly ${settings.format} objects. Each object must contain 'round', 'visiblePlayer' (name, position, club, rating), and 'hiddenPlayer' (name, position, club, rating). 
Difficulty Level: ${difficultyStr}. 
CRITICAL RULES: 
1. ${formationRequirements}
2. The 'hiddenPlayer' MUST play in the exact same position as the 'visiblePlayer' in that round.
3. You MUST include players from ALL of these categories across the draft: Top 5 European Leagues, Famous National Teams, Egyptian Premier League, Saudi Pro League, and Retired Legends. 
Make sure the players match the requested difficulty level! Do not output anything other than valid JSON. Generate the response strictly in ${lang === 'ar' ? 'Arabic' : 'English'}.`
  
  const draftPool = await generateJsonWithRetry(prompt)
  
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
  
  await socketServer.trigger(`room-${room.code}`, 'draft-pool-generated', { settings })
}

export async function placeBid(roomId: string, userId: string, customBidAmount: number) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } })
  if (!room) throw new Error('Room not found')
  
  const user = room.participants.find(u => u.id === userId)
  if (!user) throw new Error('User not found')
  if (user.budgetLeft < customBidAmount) throw new Error('Insufficient budget')
  
  const settings = JSON.parse(room.settings)
  if (settings.bidding.turnId !== userId) throw new Error('Not your turn')
  if (customBidAmount <= settings.bidding.currentBid) throw new Error('Bid must be higher than current bid')
  
  const opponent = room.participants.find(u => u.id !== userId)
  
  settings.bidding.currentBid = customBidAmount
  settings.bidding.currentBidderId = userId
  settings.bidding.turnId = opponent?.id
  
  await prisma.room.update({
    where: { id: roomId },
    data: { settings: JSON.stringify(settings) }
  })
  
  await socketServer.trigger(`room-${room.code}`, 'bid-updated', { bidding: settings.bidding })
}

export async function foldBid(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } })
  if (!room) throw new Error('Room not found')
  
  const settings = JSON.parse(room.settings)
  if (settings.bidding.turnId !== userId) throw new Error('Not your turn')
  
  const opponent = room.participants.find(u => u.id !== userId)
  const folder = room.participants.find(u => u.id === userId)
  
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
    prisma.roomParticipant.update({ where: { id: opponent.id }, data: { squad: JSON.stringify(opponentSquad), budgetLeft: opponentNewBudget } }),
    prisma.roomParticipant.update({ where: { id: folder.id }, data: { squad: JSON.stringify(folderSquad), budgetLeft: folderNewBudget } })
  ])
  
  settings.currentRound += 1
  
  let newStatus = room.status
  if (settings.currentRound >= settings.format) {
    newStatus = 'manager-assignment'
  } else {
    const playingParticipants = room.participants.filter(u => u.role !== 'spectator')
    const firstTurnId = settings.firstTurnId
    const secondTurnId = playingParticipants.find(u => u.id !== firstTurnId)?.id || folder.id
    
    settings.bidding = {
      currentBid: 0,
      currentBidderId: null,
      turnId: settings.currentRound % 2 === 0 ? firstTurnId : secondTurnId
    }
  }
  
  await prisma.room.update({
    where: { id: roomId },
    data: { status: newStatus, settings: JSON.stringify(settings) }
  })
  
  const updatedRoom = await prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } })
  
  await socketServer.trigger(`room-${room.code}`, 'round-resolved', { 
    settings, 
    status: newStatus,
    users: updatedRoom?.participants
  })
}

export async function assignManagers(roomId: string, lang: string = 'en') {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } })
  if (!room) throw new Error('Room not found')
  
  const players = room.participants.filter((u: any) => u.role !== 'spectator')
  const user1 = players[0]
  const user2 = players[1]
  
  if (user1.manager && user2.manager) return
  
  const prompt = `You are a football expert. Based on the remaining budget of Player 1 (Budget: ${user1.budgetLeft / 1000000}M) and Player 2 (Budget: ${user2.budgetLeft / 1000000}M), assign a real-life football manager to each. High budget (e.g., >30M) = Elite manager (e.g., Guardiola, Ancelotti). Medium/Low budget = Mid-tier or local manager. Return STRICTLY valid JSON with this structure: { "player1Manager": { "name": "...", "tacticalStyle": "...", "tier": "..." }, "player2Manager": { "name": "...", "tacticalStyle": "...", "tier": "..." } }. Generate the response strictly in ${lang === 'ar' ? 'Arabic' : 'English'}.`
  
  const response = await generateJsonWithRetry(prompt)
  
  if (!response.player1Manager || !response.player2Manager) {
    throw new Error("AI returned invalid JSON structure for managers")
  }
  
  const [updatedUser1, updatedUser2] = await prisma.$transaction([
    prisma.roomParticipant.update({
      where: { id: user1.id },
      data: { manager: JSON.stringify(response.player1Manager) }
    }),
    prisma.roomParticipant.update({
      where: { id: user2.id },
      data: { manager: JSON.stringify(response.player2Manager) }
    })
  ])
  
  await socketServer.trigger(`room-${room.code}`, 'managers-assigned', {
    users: [updatedUser1, updatedUser2]
  })
}

export async function startSimulation(roomId: string) {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: { status: 'simulation' }
  })
  await socketServer.trigger(`room-${room.code}`, 'room-updated', { status: 'simulation' })
}

export async function simulateMatch(roomId: string, lang: string = 'en') {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } })
  if (!room) throw new Error('Room not found')
  
  const players = room.participants.filter((u: any) => u.role !== 'spectator')
  const user1 = players[0]
  const user2 = players[1]
  
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

  const response = await generateJsonWithRetry(prompt)
  
  settings.matchResult = response
  
  await prisma.room.update({
    where: { id: roomId },
    data: { settings: JSON.stringify(settings) }
  })
  
  await socketServer.trigger(`room-${room.code}`, 'match-simulated', { result: response })
}

export async function exitRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } })
  if (!room) return

  const participant = room.participants.find(p => p.userId === userId)
  if (!participant) return

  if (room.status !== 'waiting' && participant.role !== 'spectator') {
    // Abort the match if a playing participant leaves after game starts
    await prisma.room.update({ where: { id: roomId }, data: { status: 'aborted' } })
    await socketServer.trigger(`room-${room.code}`, 'room-updated', { status: 'aborted' })
  } else {
    // Just remove the participant
    await prisma.roomParticipant.delete({ where: { id: participant.id } })
    await socketServer.trigger(`room-${room.code}`, 'player-left', { userId })
  }
}

export async function swapRoles(roomId: string, participantId1: string, participantId2: string) {
  const p1 = await prisma.roomParticipant.findUnique({ where: { id: participantId1 } })
  const p2 = await prisma.roomParticipant.findUnique({ where: { id: participantId2 } })
  if (!p1 || !p2) return

  await prisma.$transaction([
    prisma.roomParticipant.update({ where: { id: p1.id }, data: { role: p2.role } }),
    prisma.roomParticipant.update({ where: { id: p2.id }, data: { role: p1.role } })
  ])

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (room) {
    await socketServer.trigger(`room-${room.code}`, 'roles-swapped', {})
  }
}
