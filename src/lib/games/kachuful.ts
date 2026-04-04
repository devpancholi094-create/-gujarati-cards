/**
 * KACHUFUL (કાચૂ ફૂલ) - Judgment / Oh Hell variant
 * 
 * 4 players, 13 rounds (compulsory)
 * Round 1: 1 card each, Round 2: 2 cards each... Round 13: 13 cards each
 * 
 * Each round:
 * 1. Deal N cards (N = round number)
 * 2. Reveal trump suit (top card of remaining deck, or chosen)
 * 3. Each player bids how many tricks they will win (0 to N)
 * 4. Play tricks - must follow suit, trump beats all
 * 5. Score: if bid == tricks won → 10 + bid*2 points. Otherwise → 0
 */

import { Card, Suit, SUITS, createDeck, shuffleDeck } from './deck'

export const TOTAL_ROUNDS = 13

export interface KachuFulState {
  phase: 'bidding' | 'playing' | 'round_over' | 'game_over'
  round: number              // 1 to 13
  hands: Record<string, Card[]>
  trump: Suit
  bids: Record<string, number>     // player's bid for this round
  tricksTaken: Record<string, number> // tricks won this round
  currentTrick: { playerId: string; card: Card }[]
  currentPlayer: string
  ledSuit: Suit | null
  bidOrder: string[]         // order players bid
  currentBidderIdx: number
  playerOrder: string[]
  scores: Record<string, number>   // cumulative scores
  roundScores: Record<string, number> // scores this round only
  trickLeader: string        // who leads first trick each round
  message: string
  lastTrickWinner: string | null
  roundHistory: {
    round: number
    bids: Record<string, number>
    tricks: Record<string, number>
    scores: Record<string, number>
  }[]
}

const RANK_VAL: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
}

export function initKachuFul(playerIds: string[]): KachuFulState {
  if (playerIds.length !== 4) throw new Error('KachuFul requires exactly 4 players')
  return startRound({
    phase: 'bidding',
    round: 1,
    hands: {},
    trump: 'spades',
    bids: {},
    tricksTaken: Object.fromEntries(playerIds.map(id => [id, 0])),
    currentTrick: [],
    currentPlayer: playerIds[0],
    ledSuit: null,
    bidOrder: playerIds,
    currentBidderIdx: 0,
    playerOrder: playerIds,
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    roundScores: Object.fromEntries(playerIds.map(id => [id, 0])),
    trickLeader: playerIds[0],
    message: '',
    lastTrickWinner: null,
    roundHistory: [],
  })
}

function startRound(state: KachuFulState): KachuFulState {
  const { round, playerOrder } = state
  const deck = shuffleDeck(createDeck())
  
  // Deal 'round' cards to each player
  const hands: Record<string, Card[]> = {}
  let deckIdx = 0
  for (const id of playerOrder) {
    hands[id] = []
    for (let i = 0; i < round; i++) {
      hands[id].push(deck[deckIdx++])
    }
  }
  
  // Trump = next card after dealing (or cycle through suits)
  // We rotate trump: round 1-4 = spades/hearts/diamonds/clubs, then repeat
  const trumpSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  let trump: Suit
  if (deckIdx < deck.length) {
    trump = deck[deckIdx].suit  // reveal next card as trump
  } else {
    trump = trumpSuits[(round - 1) % 4]
  }

  // Dealer rotates each round — leader is player after dealer
  const leaderIdx = (round - 1) % playerOrder.length
  const leader = playerOrder[leaderIdx]

  return {
    ...state,
    phase: 'bidding',
    hands,
    trump,
    bids: {},
    tricksTaken: Object.fromEntries(playerOrder.map(id => [id, 0])),
    currentTrick: [],
    currentPlayer: leader,
    ledSuit: null,
    bidOrder: [...playerOrder.slice(leaderIdx), ...playerOrder.slice(0, leaderIdx)],
    currentBidderIdx: 0,
    trickLeader: leader,
    lastTrickWinner: null,
    message: `Round ${round} · ${round} card${round > 1 ? 's' : ''} each · Trump: ${trump}`,
  }
}

// Fix the broken closure above
export function startNewRound(state: KachuFulState): KachuFulState {
  const { round, playerOrder } = state
  const deck = shuffleDeck(createDeck())

  const hands: Record<string, Card[]> = {}
  let deckIdx = 0
  for (const id of playerOrder) {
    hands[id] = []
    for (let i = 0; i < round; i++) {
      hands[id].push(deck[deckIdx++])
    }
  }

  const trumpSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  let trump: Suit = deckIdx < deck.length ? deck[deckIdx].suit : trumpSuits[(round - 1) % 4]

  const leaderIdx = (round - 1) % playerOrder.length
  const leader = playerOrder[leaderIdx]
  const bidOrder = [...playerOrder.slice(leaderIdx), ...playerOrder.slice(0, leaderIdx)]

  return {
    ...state,
    phase: 'bidding',
    hands,
    trump,
    bids: {},
    tricksTaken: Object.fromEntries(playerOrder.map(id => [id, 0])),
    currentTrick: [],
    currentPlayer: leader,
    ledSuit: null,
    bidOrder,
    currentBidderIdx: 0,
    trickLeader: leader,
    lastTrickWinner: null,
    roundScores: Object.fromEntries(playerOrder.map(id => [id, 0])),
    message: `Round ${round} · ${round} card${round > 1 ? 's' : ''} each · Trump: ${trump}`,
  }
}

export function placeBidKachu(state: KachuFulState, playerId: string, bid: number): KachuFulState {
  if (state.phase !== 'bidding') throw new Error('Not bidding phase')
  if (state.bidOrder[state.currentBidderIdx] !== playerId) throw new Error('Not your turn to bid')
  if (bid < 0 || bid > state.round) throw new Error(`Bid must be 0 to ${state.round}`)

  const newBids = { ...state.bids, [playerId]: bid }
  const nextBidderIdx = state.currentBidderIdx + 1
  const allBid = nextBidderIdx >= state.playerOrder.length

  if (allBid) {
    // All bids placed — start playing, leader goes first
    const totalBids = Object.values(newBids).reduce((a, b) => a + b, 0)
    return {
      ...state,
      bids: newBids,
      phase: 'playing',
      currentPlayer: state.trickLeader,
      currentBidderIdx: nextBidderIdx,
      message: `All bids in! Total bids: ${totalBids}/${state.round}. ${state.trickLeader} leads first.`,
    }
  }

  const nextBidder = state.bidOrder[nextBidderIdx]
  return {
    ...state,
    bids: newBids,
    currentBidderIdx: nextBidderIdx,
    currentPlayer: nextBidder,
    message: `${nextBidder}'s turn to bid (0–${state.round})`,
  }
}

export function playKachuFulCard(state: KachuFulState, playerId: string, card: Card): KachuFulState {
  if (state.phase !== 'playing') throw new Error('Not playing phase')
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')

  const hand = state.hands[playerId] || []
  if (!hand.find(c => c.id === card.id)) throw new Error('Card not in hand')

  // Must follow led suit if possible
  const led = state.ledSuit
  if (led && state.currentTrick.length > 0) {
    const hasSuit = hand.some(c => c.suit === led)
    if (hasSuit && card.suit !== led) throw new Error(`Must follow suit: ${led}`)
  }

  const newHand = hand.filter(c => c.id !== card.id)
  const newTrick = [...state.currentTrick, { playerId, card }]
  const newLed = (state.currentTrick.length === 0 ? card.suit : led) as Suit

  const order = state.playerOrder
  const nextIdx = (order.indexOf(playerId) + 1) % order.length

  const newState: KachuFulState = {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    currentTrick: newTrick,
    ledSuit: newLed,
    currentPlayer: order[nextIdx],
  }

  if (newTrick.length === order.length) {
    return resolveTrick(newState)
  }
  return newState
}

function resolveTrick(state: KachuFulState): KachuFulState {
  const trick = state.currentTrick
  const led = state.ledSuit!
  const trump = state.trump

  let winner = trick[0]
  for (const play of trick.slice(1)) {
    const wTrump = winner.card.suit === trump
    const pTrump = play.card.suit === trump
    if (pTrump && !wTrump) { winner = play; continue }
    if (!pTrump && wTrump) continue
    if (play.card.suit === winner.card.suit && RANK_VAL[play.card.rank] > RANK_VAL[winner.card.rank]) {
      winner = play
    }
  }

  const newTricksTaken = {
    ...state.tricksTaken,
    [winner.playerId]: state.tricksTaken[winner.playerId] + 1,
  }

  const totalTricksPlayed = Object.values(newTricksTaken).reduce((a, b) => a + b, 0)

  if (totalTricksPlayed === state.round) {
    return endRound({ ...state, tricksTaken: newTricksTaken, currentTrick: [], ledSuit: null, lastTrickWinner: winner.playerId })
  }

  return {
    ...state,
    tricksTaken: newTricksTaken,
    currentTrick: [],
    ledSuit: null,
    currentPlayer: winner.playerId,
    lastTrickWinner: winner.playerId,
    message: `${winner.playerId} wins the trick!`,
  }
}

function endRound(state: KachuFulState): KachuFulState {
  const { playerOrder, bids, tricksTaken, scores, round, roundHistory } = state

  // Score: bid == tricks → 10 + bid*2, else 0
  const roundScores: Record<string, number> = {}
  let msg = `Round ${round} over! `
  
  for (const id of playerOrder) {
    const bid = bids[id] ?? 0
    const tricks = tricksTaken[id] ?? 0
    if (bid === tricks) {
      roundScores[id] = 10 + bid * 2
      msg += `✅ `
    } else {
      roundScores[id] = 0
      msg += `❌ `
    }
  }

  const newScores: Record<string, number> = {}
  for (const id of playerOrder) {
    newScores[id] = (scores[id] || 0) + (roundScores[id] || 0)
  }

  const historyEntry = { round, bids: { ...bids }, tricks: { ...tricksTaken }, scores: { ...roundScores } }
  const newHistory = [...roundHistory, historyEntry]

  const isGameOver = round >= TOTAL_ROUNDS

  if (isGameOver) {
    const winner = playerOrder.reduce((best, id) => newScores[id] > newScores[best] ? id : best, playerOrder[0])
    return {
      ...state,
      phase: 'game_over',
      scores: newScores,
      roundScores,
      roundHistory: newHistory,
      message: `🏆 Game over! ${winner} wins with ${newScores[winner]} points!`,
    }
  }

  return {
    ...state,
    phase: 'round_over',
    scores: newScores,
    roundScores,
    roundHistory: newHistory,
    message: msg,
  }
}

export function nextRoundKachu(state: KachuFulState): KachuFulState {
  return startNewRound({ ...state, round: state.round + 1 })
}

export function getValidKachuFulCards(state: KachuFulState, playerId: string): Card[] {
  const hand = state.hands[playerId] || []
  if (!state.ledSuit || state.currentTrick.length === 0) return hand
  const suited = hand.filter(c => c.suit === state.ledSuit)
  return suited.length > 0 ? suited : hand
}
