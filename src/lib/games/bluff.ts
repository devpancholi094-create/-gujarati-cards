/**
 * BLUFF (બ્લફ) - Liar's Bar style card game
 * 
 * 2-8 players, 2 decks mixed (104 cards)
 * Players play cards face-down claiming any rank
 * Others can call bluff
 * First to empty hand wins!
 * 
 * Rules:
 * - 2 decks shuffled together, dealt equally
 * - On your turn: play 1-4 cards face down, claim any rank (e.g. "three 7s")
 * - Other players can call BLUFF
 * - If caught bluffing → pick up entire pile
 * - If falsely accused → accuser picks up entire pile
 * - Jokers are wild (can be anything, never caught as bluff)
 * - First player to empty hand wins
 * - Last player with cards loses
 */

import { Card, Suit, RANKS, Rank, SUITS } from './deck'

export type BluffRank = Rank | 'Joker'

export interface BluffCard extends Card {
  isJoker?: boolean
}

export interface BluffState {
  phase: 'playing' | 'bluff_called' | 'round_over' | 'game_over'
  hands: Record<string, BluffCard[]>
  pile: BluffCard[]                    // face-down pile in center
  pileHistory: {                       // what each play claimed
    playerId: string
    claimedRank: Rank
    count: number
    cards: BluffCard[]                 // actual cards played
  }[]
  currentPlayer: string
  playerOrder: string[]
  lastPlay: {
    playerId: string
    claimedRank: Rank
    count: number
    actualCards: BluffCard[]
  } | null
  bluffResult: {
    caller: string
    target: string
    wasBluff: boolean
    cards: BluffCard[]
    penaltyPlayer: string
  } | null
  finished: string[]          // order of players who emptied hands
  scores: Record<string, number>  // wins per player
  round: number
  message: string
  playerOrder_turn: string[]  // for display
}

// Create double deck with jokers
export function createDoubleDeck(): BluffCard[] {
  const deck: BluffCard[] = []
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, id: `${rank}-${suit}-${d}` })
      }
    }
    // 2 jokers per deck
    deck.push({ suit: 'spades', rank: 'A', id: `joker-red-${d}`, isJoker: true })
    deck.push({ suit: 'hearts', rank: 'A', id: `joker-black-${d}`, isJoker: true })
  }
  return deck
}

function shuffleBluff(deck: BluffCard[]): BluffCard[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function initBluff(playerIds: string[]): BluffState {
  if (playerIds.length < 2) throw new Error('Need at least 2 players')

  const deck = shuffleBluff(createDoubleDeck())
  const hands: Record<string, BluffCard[]> = {}
  playerIds.forEach(id => { hands[id] = [] })

  // Deal evenly, leftover goes to first player
  deck.forEach((card, i) => {
    hands[playerIds[i % playerIds.length]].push(card)
  })

  return {
    phase: 'playing',
    hands,
    pile: [],
    pileHistory: [],
    currentPlayer: playerIds[0],
    playerOrder: playerIds,
    lastPlay: null,
    bluffResult: null,
    finished: [],
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    round: 1,
    message: `Game started! ${playerIds[0]} goes first. Play cards and claim any rank!`,
    playerOrder_turn: playerIds,
  }
}

export function playBluffCards(
  state: BluffState,
  playerId: string,
  cardIds: string[],
  claimedRank: Rank
): BluffState {
  if (state.phase !== 'playing') throw new Error('Not playing phase')
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')
  if (cardIds.length < 1 || cardIds.length > 4) throw new Error('Play 1 to 4 cards')

  const hand = state.hands[playerId] || []
  const playedCards: BluffCard[] = []

  for (const id of cardIds) {
    const card = hand.find(c => c.id === id)
    if (!card) throw new Error('Card not in hand')
    playedCards.push(card)
  }

  const newHand = hand.filter(c => !cardIds.includes(c.id))
  const newPile = [...state.pile, ...playedCards]
  const newPileHistory = [...state.pileHistory, {
    playerId,
    claimedRank,
    count: cardIds.length,
    cards: playedCards,
  }]

  // Check if player finished
  const newFinished = newHand.length === 0 ? [...state.finished, playerId] : state.finished

  // Next player (skip finished)
  const order = state.playerOrder
  let nextIdx = (order.indexOf(playerId) + 1) % order.length
  let tries = 0
  while (newFinished.includes(order[nextIdx]) && tries < order.length) {
    nextIdx = (nextIdx + 1) % order.length
    tries++
  }

  // Game over if only 1 player left
  const activePlayers = order.filter(id => !newFinished.includes(id))
  if (activePlayers.length <= 1) {
    if (activePlayers.length === 1) newFinished.push(activePlayers[0])
    const newScores = { ...state.scores }
    if (newFinished.length > 0) newScores[newFinished[0]] = (newScores[newFinished[0]] || 0) + 1
    return {
      ...state,
      hands: { ...state.hands, [playerId]: newHand },
      pile: newPile,
      pileHistory: newPileHistory,
      finished: newFinished,
      scores: newScores,
      phase: 'game_over',
      lastPlay: { playerId, claimedRank, count: cardIds.length, actualCards: playedCards },
      message: `🏆 ${newFinished[0]} wins!`,
    }
  }

  const cardWord = cardIds.length === 1 ? 'card' : 'cards'
  return {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    pile: newPile,
    pileHistory: newPileHistory,
    currentPlayer: order[nextIdx],
    finished: newFinished,
    lastPlay: { playerId, claimedRank, count: cardIds.length, actualCards: playedCards },
    bluffResult: null,
    message: `${playerId} played ${cardIds.length} ${cardWord} claiming "${cardIds.length}× ${claimedRank}"`,
  }
}

export function callBluff(state: BluffState, callerId: string): BluffState {
  if (state.phase !== 'playing') throw new Error('Not playing phase')
  if (!state.lastPlay) throw new Error('No play to call bluff on')
  if (callerId === state.lastPlay.playerId) throw new Error('Cannot call bluff on yourself')
  if (state.finished.includes(callerId)) throw new Error('Already finished')

  const { playerId: targetId, claimedRank, actualCards } = state.lastPlay

  // Check if all played cards match claimed rank (jokers are always true)
  const wasBluff = actualCards.some(card => !card.isJoker && card.rank !== claimedRank)

  let penaltyPlayer: string
  let newHands = { ...state.hands }

  if (wasBluff) {
    // Target was bluffing → target picks up pile
    penaltyPlayer = targetId
    newHands[targetId] = [...(newHands[targetId] || []), ...state.pile]
    // Remove from finished if they were there
  } else {
    // Caller was wrong → caller picks up pile
    penaltyPlayer = callerId
    newHands[callerId] = [...(newHands[callerId] || []), ...state.pile]
  }

  // Remove penalty player from finished if they were finished
  const newFinished = state.finished.filter(id => id !== penaltyPlayer)

  // Penalty player goes next
  const order = state.playerOrder

  return {
    ...state,
    hands: newHands,
    pile: [],
    pileHistory: [],
    currentPlayer: penaltyPlayer,
    finished: newFinished,
    lastPlay: null,
    bluffResult: {
      caller: callerId,
      target: targetId,
      wasBluff,
      cards: actualCards,
      penaltyPlayer,
    },
    message: wasBluff
      ? `🎭 BLUFF! ${targetId} lied! They pick up ${state.pile.length} cards!`
      : `✅ Honest! ${callerId} was wrong and picks up ${state.pile.length} cards!`,
  }
}

export function getHandSize(state: BluffState, playerId: string): number {
  return state.hands[playerId]?.length || 0
}

export const BLUFF_RANKS = RANKS  // A 2 3 4 5 6 7 8 9 10 J Q K
