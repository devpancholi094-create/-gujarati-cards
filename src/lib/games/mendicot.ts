import { Card, createDeck, shuffleDeck, dealCards, RANK_VALUE } from './deck'
import type { Suit, Rank } from './deck'

export interface MendicotState {
  phase: 'playing' | 'round_over'
  hands: Record<string, Card[]>
  currentTrick: { playerId: string; card: Card }[]
  currentPlayer: string
  ledSuit: Suit | null
  tricks: Record<string, number>
  mendis: Record<string, number>
  scores: { team0: number; team1: number }
  round: number
  playerOrder: string[]
  teams: { team0: string[]; team1: string[] }
  lastTrickWinner: string | null
  message: string
}

const RANK_VAL: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
}

export function initMendicot(playerIds: string[], prevScores?: { team0: number; team1: number }, round?: number): MendicotState {
  if (playerIds.length !== 4) throw new Error('Mendicot requires exactly 4 players')
  const deck = shuffleDeck(createDeck())
  const dealtHands = dealCards(deck, 4)
  const hands: Record<string, Card[]> = {}
  playerIds.forEach((id, i) => { hands[id] = dealtHands[i] })
  return {
    phase: 'playing',
    hands,
    currentTrick: [],
    currentPlayer: playerIds[0],
    ledSuit: null,
    tricks: Object.fromEntries(playerIds.map(id => [id, 0])),
    mendis: Object.fromEntries(playerIds.map(id => [id, 0])),
    scores: prevScores || { team0: 0, team1: 0 },
    round: round || 1,
    playerOrder: playerIds,
    teams: { team0: [playerIds[0], playerIds[2]], team1: [playerIds[1], playerIds[3]] },
    lastTrickWinner: null,
    message: 'Game started! ' + playerIds[0] + ' leads first.',
  }
}

export function getValidMendicotCards(state: MendicotState, playerId: string): Card[] {
  const hand = state.hands[playerId] || []
  if (!state.ledSuit || state.currentTrick.length === 0) return hand
  const suited = hand.filter(c => c.suit === state.ledSuit)
  return suited.length > 0 ? suited : hand
}

export function playMendicotCard(state: MendicotState, playerId: string, card: Card): MendicotState {
  if (state.phase !== 'playing') throw new Error('Not playing')
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')
  const hand = state.hands[playerId]
  if (!hand.find(c => c.id === card.id)) throw new Error('Card not in hand')

  const valid = getValidMendicotCards(state, playerId)
  if (!valid.find(c => c.id === card.id)) throw new Error('Must follow suit: ' + state.ledSuit)

  const newHand = hand.filter(c => c.id !== card.id)
  const newTrick = [...state.currentTrick, { playerId, card }]
  const newLedSuit = (state.currentTrick.length === 0 ? card.suit : state.ledSuit) as Suit
  const order = state.playerOrder
  const nextIdx = (order.indexOf(playerId) + 1) % order.length

  const newState: MendicotState = {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    currentTrick: newTrick,
    ledSuit: newLedSuit,
    currentPlayer: order[nextIdx],
  }

  if (newTrick.length === order.length) return resolveTrick(newState)
  return newState
}

function resolveTrick(state: MendicotState): MendicotState {
  const trick = state.currentTrick
  const led = state.ledSuit!
  let winner = trick[0]
  for (const play of trick.slice(1)) {
    if (play.card.suit === led && RANK_VAL[play.card.rank] > RANK_VAL[winner.card.rank]) winner = play
  }
  const mendisInTrick = trick.filter(p => p.card.rank === '10').length
  const newTricks = { ...state.tricks, [winner.playerId]: state.tricks[winner.playerId] + 1 }
  const newMendis = { ...state.mendis, [winner.playerId]: state.mendis[winner.playerId] + mendisInTrick }
  const totalTricks = Object.values(newTricks).reduce((a, b) => a + b, 0)

  if (totalTricks === 13) {
    return endRound({ ...state, tricks: newTricks, mendis: newMendis, currentTrick: [], ledSuit: null, lastTrickWinner: winner.playerId })
  }
  return { ...state, tricks: newTricks, mendis: newMendis, currentTrick: [], ledSuit: null, currentPlayer: winner.playerId, lastTrickWinner: winner.playerId, message: '' }
}

function endRound(state: MendicotState): MendicotState {
  const { teams, tricks } = state
  const t0 = teams.team0.reduce((s, id) => s + tricks[id], 0)
  const t1 = teams.team1.reduce((s, id) => s + tricks[id], 0)
  let { team0, team1 } = state.scores
  let msg = ''
  if (t0 >= 7) {
    team0 += t0 === 13 ? 2 : 1
    msg = t0 === 13 ? '🏆 Team A sweeps all 13 tricks! +2 points!' : `✅ Team A wins with ${t0} tricks!`
  } else {
    team1 += t1 === 13 ? 2 : 1
    msg = t1 === 13 ? '🏆 Team B sweeps all 13 tricks! +2 points!' : `✅ Team B wins with ${t1} tricks!`
  }
  const m0 = teams.team0.reduce((s, id) => s + state.mendis[id], 0)
  const m1 = teams.team1.reduce((s, id) => s + state.mendis[id], 0)
  if (m0 === 4) msg += ' 🎴 Team A collected all mendis!'
  if (m1 === 4) msg += ' 🎴 Team B collected all mendis!'
  return { ...state, phase: 'round_over', scores: { team0, team1 }, message: msg }
}
