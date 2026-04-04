import { Card, Suit, SUITS, RANKS, createDeck, shuffleDeck, dealCards } from './deck'

export interface SattoState {
  phase: 'playing' | 'round_over'
  hands: Record<string, Card[]>
  table: Record<Suit, { low: number; high: number }>
  currentPlayer: string
  playerOrder: string[]
  passCount: Record<string, number>
  finished: string[]
  message: string
}

const SEVEN_IDX = RANKS.indexOf('7')

export function initSatto(playerIds: string[]): SattoState {
  const deck = shuffleDeck(createDeck())
  const dealt = dealCards(deck, playerIds.length)
  const hands: Record<string, Card[]> = {}
  playerIds.forEach((id, i) => { hands[id] = dealt[i] })

  let startPlayer = playerIds[0]
  for (const [id, hand] of Object.entries(hands)) {
    if (hand.some(c => c.rank === '7' && c.suit === 'spades')) { startPlayer = id; break }
  }

  return {
    phase: 'playing',
    hands,
    table: { spades: { low: -1, high: -1 }, hearts: { low: -1, high: -1 }, diamonds: { low: -1, high: -1 }, clubs: { low: -1, high: -1 } },
    currentPlayer: startPlayer,
    playerOrder: playerIds,
    passCount: Object.fromEntries(playerIds.map(id => [id, 0])),
    finished: [],
    message: 'Game started! Player with 7♠ goes first.',
  }
}

export function isValidSattoPlay(state: SattoState, card: Card): boolean {
  const allEmpty = SUITS.every(s => state.table[s].low === -1)
  if (allEmpty) return card.rank === '7' && card.suit === 'spades'
  const { low, high } = state.table[card.suit]
  const idx = RANKS.indexOf(card.rank)
  if (low === -1) return card.rank === '7'
  return idx === low - 1 || idx === high + 1
}

export function getValidSattoCards(state: SattoState, playerId: string): Card[] {
  return (state.hands[playerId] || []).filter(c => isValidSattoPlay(state, c))
}

export function playSattoCard(state: SattoState, playerId: string, card: Card | null): SattoState {
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')
  const order = state.playerOrder
  const finished = state.finished

  function nextActive(from: string): string {
    let idx = (order.indexOf(from) + 1) % order.length
    let tries = 0
    while (finished.includes(order[idx]) && tries < order.length) { idx = (idx + 1) % order.length; tries++ }
    return order[idx]
  }

  if (!card) {
    const valid = getValidSattoCards(state, playerId)
    const penalty = valid.length > 0
    return {
      ...state,
      passCount: { ...state.passCount, [playerId]: state.passCount[playerId] + (penalty ? 1 : 0) },
      currentPlayer: nextActive(playerId),
      message: penalty ? `${playerId} passed (penalty!)` : `${playerId} passed`,
    }
  }

  if (!isValidSattoPlay(state, card)) throw new Error('Invalid play')

  const rankIdx = RANKS.indexOf(card.rank)
  const suit = card.suit
  const suitState = state.table[suit]
  const newTable = { ...state.table }

  if (suitState.low === -1) {
    newTable[suit] = { low: SEVEN_IDX, high: SEVEN_IDX }
  } else if (rankIdx === suitState.low - 1) {
    newTable[suit] = { ...suitState, low: rankIdx }
  } else {
    newTable[suit] = { ...suitState, high: rankIdx }
  }

  const newHand = (state.hands[playerId] || []).filter(c => c.id !== card.id)
  const newHands = { ...state.hands, [playerId]: newHand }
  const newFinished = newHand.length === 0 ? [...finished, playerId] : finished
  const active = order.filter(id => !newFinished.includes(id))
  const phase = active.length <= 1 ? 'round_over' : 'playing'
  if (active.length === 1) newFinished.push(active[0])

  return {
    ...state,
    hands: newHands,
    table: newTable,
    currentPlayer: nextActive(playerId),
    finished: newFinished,
    phase,
    message: phase === 'round_over' ? 'Round over!' : '',
  }
}

export function getTableDisplay(state: SattoState): Record<Suit, string[]> {
  const out: Record<Suit, string[]> = { spades: [], hearts: [], diamonds: [], clubs: [] }
  for (const suit of SUITS) {
    const { low, high } = state.table[suit]
    if (low === -1) continue
    for (let i = low; i <= high; i++) out[suit].push(RANKS[i])
  }
  return out
}
