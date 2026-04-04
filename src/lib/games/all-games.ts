import { Card, Suit, SUITS, RANKS, createDeck, shuffleDeck, dealCards } from './deck'

// ─────────────────────────────────────────────
// KACHU PHOOL (Hearts / Avoid penalty cards)
// ─────────────────────────────────────────────
export interface KachuState {
  phase: 'playing' | 'round_over'
  hands: Record<string, Card[]>
  currentTrick: { playerId: string; card: Card }[]
  currentPlayer: string
  ledSuit: Suit | null
  heartsBroken: boolean
  wonCards: Record<string, Card[]>
  scores: Record<string, number>
  roundScores: Record<string, number>
  playerOrder: string[]
  message: string
  shooterMoon: string | null
}

export function penaltyValue(card: Card): number {
  if (card.suit === 'hearts') return 1
  if (card.suit === 'spades' && card.rank === 'Q') return 13
  return 0
}

export function initKachu(playerIds: string[]): KachuState {
  const deck = shuffleDeck(createDeck())
  const dealt = dealCards(deck, playerIds.length)
  const hands: Record<string, Card[]> = {}
  playerIds.forEach((id, i) => { hands[id] = dealt[i] })

  // 2 of clubs starts (or lowest club)
  let startPlayer = playerIds[0]
  for (const [id, hand] of Object.entries(hands)) {
    if (hand.some(c => c.rank === '2' && c.suit === 'clubs')) { startPlayer = id; break }
  }

  return {
    phase: 'playing',
    hands,
    currentTrick: [],
    currentPlayer: startPlayer,
    ledSuit: null,
    heartsBroken: false,
    wonCards: Object.fromEntries(playerIds.map(id => [id, []])),
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    roundScores: Object.fromEntries(playerIds.map(id => [id, 0])),
    playerOrder: playerIds,
    message: 'Game started! Player with 2♣ leads.',
    shooterMoon: null,
  }
}

export function getValidKachuCards(state: KachuState, playerId: string): Card[] {
  const hand = state.hands[playerId] || []
  // First trick: must play/follow clubs, can't lead hearts
  if (state.currentTrick.length === 0) {
    // Leading - can't lead hearts unless broken or only hearts
    if (!state.heartsBroken) {
      const nonHearts = hand.filter(c => c.suit !== 'hearts')
      if (nonHearts.length > 0) return nonHearts
    }
    return hand
  }
  // Must follow suit
  const led = state.ledSuit!
  const suited = hand.filter(c => c.suit === led)
  return suited.length > 0 ? suited : hand
}

export function playKachuCard(state: KachuState, playerId: string, card: Card): KachuState {
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')
  const hand = state.hands[playerId] || []
  if (!hand.find(c => c.id === card.id)) throw new Error('Card not in hand')

  const valid = getValidKachuCards(state, playerId)
  if (!valid.find(c => c.id === card.id)) throw new Error('Invalid card')

  const newHand = hand.filter(c => c.id !== card.id)
  const newTrick = [...state.currentTrick, { playerId, card }]
  const newLed = (state.currentTrick.length === 0 ? card.suit : state.ledSuit) as Suit
  const heartsBroken = state.heartsBroken || card.suit === 'hearts'
  const order = state.playerOrder
  const nextIdx = (order.indexOf(playerId) + 1) % order.length

  const newState: KachuState = {
    ...state,
    hands: { ...state.hands, [playerId]: newHand },
    currentTrick: newTrick,
    ledSuit: newLed,
    heartsBroken,
    currentPlayer: order[nextIdx],
  }

  if (newTrick.length === order.length) return resolveKachuTrick(newState)
  return newState
}

function resolveKachuTrick(state: KachuState): KachuState {
  const trick = state.currentTrick
  const led = state.ledSuit!
  const rankVal = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0

  let winner = trick[0]
  for (const p of trick.slice(1)) {
    if (p.card.suit === led && rankVal(p.card.rank) > rankVal(winner.card.rank)) winner = p
  }

  const newWon = { ...state.wonCards, [winner.playerId]: [...state.wonCards[winner.playerId], ...trick.map(t => t.card)] }
  const totalPlayed = Object.values(newWon).reduce((s, cards) => s + cards.length, 0)

  const newState: KachuState = { ...state, wonCards: newWon, currentTrick: [], ledSuit: null, currentPlayer: winner.playerId }

  if (totalPlayed === 52) return endKachuRound(newState)
  return newState
}

function endKachuRound(state: KachuState): KachuState {
  const roundScores: Record<string, number> = {}
  for (const [pid, cards] of Object.entries(state.wonCards)) {
    roundScores[pid] = cards.reduce((s, c) => s + penaltyValue(c), 0)
  }

  // Check shoot the moon
  let shooterMoon: string | null = null
  for (const [pid, score] of Object.entries(roundScores)) {
    if (score === 26) { shooterMoon = pid; break }
  }

  const newScores = { ...state.scores }
  let msg = 'Round over! '
  if (shooterMoon) {
    for (const pid of state.playerOrder) {
      if (pid !== shooterMoon) newScores[pid] = (newScores[pid] || 0) + 26
    }
    msg = `🌙 ${shooterMoon} shot the moon! All others get +26!`
  } else {
    for (const [pid, score] of Object.entries(roundScores)) {
      newScores[pid] = (newScores[pid] || 0) + score
    }
    msg += state.playerOrder.map(id => `${id}: ${roundScores[id]}pts`).join(', ')
  }

  return { ...state, phase: 'round_over', scores: newScores, roundScores, message: msg, shooterMoon }
}

// ─────────────────────────────────────────────
// 420 GAME
// ─────────────────────────────────────────────
export interface Game420State {
  phase: 'bidding' | 'trump_selection' | 'playing' | 'round_over'
  hands: Record<string, Card[]>
  bids: Record<string, number | 'pass'>
  currentBid: number
  highestBidder: string | null
  trump: Suit | null
  currentTrick: { playerId: string; card: Card }[]
  currentPlayer: string
  ledSuit: Suit | null
  tricks: Record<string, number>
  scores: Record<string, number>
  playerOrder: string[]
  bidOrder: string[]
  currentBidderIdx: number
  message: string
}

export function init420(playerIds: string[]): Game420State {
  const deck = shuffleDeck(createDeck())
  const dealt = dealCards(deck, playerIds.length)
  const hands: Record<string, Card[]> = {}
  playerIds.forEach((id, i) => { hands[id] = dealt[i] })
  return {
    phase: 'bidding', hands,
    bids: {}, currentBid: 0, highestBidder: null, trump: null,
    currentTrick: [], currentPlayer: playerIds[0], ledSuit: null,
    tricks: Object.fromEntries(playerIds.map(id => [id, 0])),
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    playerOrder: playerIds, bidOrder: playerIds,
    currentBidderIdx: 0,
    message: `Bidding! ${playerIds[0]}, bid or pass (min 5 tricks)`,
  }
}

export function placeBid(state: Game420State, playerId: string, bid: number | 'pass'): Game420State {
  const newBids = { ...state.bids, [playerId]: bid }
  let { currentBid, highestBidder } = state
  if (bid !== 'pass' && bid > currentBid) { currentBid = bid; highestBidder = playerId }

  const nextIdx = state.currentBidderIdx + 1
  const allBid = nextIdx >= state.bidOrder.length

  if (allBid) {
    const winner = highestBidder || state.playerOrder[0]
    return { ...state, bids: newBids, currentBid, highestBidder: winner, phase: 'trump_selection', currentPlayer: winner, currentBidderIdx: nextIdx, message: `${winner} won the bid with ${currentBid} tricks! Choose trump.` }
  }

  const next = state.bidOrder[nextIdx]
  return { ...state, bids: newBids, currentBid, highestBidder, currentBidderIdx: nextIdx, currentPlayer: next, message: `${next}'s turn to bid (current: ${currentBid})` }
}

export function selectTrump420(state: Game420State, suit: Suit): Game420State {
  return { ...state, trump: suit, phase: 'playing', currentPlayer: state.highestBidder || state.playerOrder[0], message: `Trump is ${suit}! Let's play!` }
}

export function play420Card(state: Game420State, playerId: string, card: Card): Game420State {
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')
  const hand = state.hands[playerId] || []
  if (!hand.find(c => c.id === card.id)) throw new Error('Card not in hand')

  // Validate suit following
  const led = state.ledSuit
  if (led && state.currentTrick.length > 0) {
    const suited = hand.filter(c => c.suit === led)
    if (suited.length > 0 && card.suit !== led) throw new Error('Must follow suit: ' + led)
  }

  const newHand = hand.filter(c => c.id !== card.id)
  const newTrick = [...state.currentTrick, { playerId, card }]
  const newLed = (state.currentTrick.length === 0 ? card.suit : led) as Suit
  const order = state.playerOrder
  const nextIdx = (order.indexOf(playerId) + 1) % order.length

  const newState: Game420State = { ...state, hands: { ...state.hands, [playerId]: newHand }, currentTrick: newTrick, ledSuit: newLed, currentPlayer: order[nextIdx] }
  if (newTrick.length === order.length) return resolve420Trick(newState)
  return newState
}

function resolve420Trick(state: Game420State): Game420State {
  const trick = state.currentTrick
  const led = state.ledSuit!
  const trump = state.trump
  const rankVal = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0

  let winner = trick[0]
  for (const p of trick.slice(1)) {
    const wTrump = trump && winner.card.suit === trump
    const pTrump = trump && p.card.suit === trump
    if (pTrump && !wTrump) { winner = p; continue }
    if (!pTrump && wTrump) continue
    if (p.card.suit === winner.card.suit && rankVal(p.card.rank) > rankVal(winner.card.rank)) winner = p
  }

  const newTricks = { ...state.tricks, [winner.playerId]: state.tricks[winner.playerId] + 1 }
  const totalTricks = Object.values(newTricks).reduce((a, b) => a + b, 0)
  const maxTricks = Math.floor(52 / state.playerOrder.length)

  if (totalTricks >= maxTricks) {
    // Score: bidder gets 10*bid if made, -10*bid if not
    const newScores = { ...state.scores }
    const bidder = state.highestBidder
    if (bidder) {
      const made = newTricks[bidder] >= state.currentBid
      newScores[bidder] = (newScores[bidder] || 0) + (made ? state.currentBid * 10 : -state.currentBid * 10)
    }
    const msg = bidder && newTricks[bidder] >= state.currentBid
      ? `✅ ${bidder} made the bid! +${state.currentBid * 10} pts`
      : `❌ ${bidder} failed the bid! -${state.currentBid * 10} pts`
    return { ...state, tricks: newTricks, scores: newScores, phase: 'round_over', currentTrick: [], ledSuit: null, message: msg }
  }

  return { ...state, tricks: newTricks, currentTrick: [], ledSuit: null, currentPlayer: winner.playerId }
}

// ─────────────────────────────────────────────
// JOKER GAME
// ─────────────────────────────────────────────
export interface JokerState {
  phase: 'trump_selection' | 'playing' | 'round_over'
  hands: Record<string, (Card & { isJoker?: boolean })[]>
  trump: Suit | null
  currentTrick: { playerId: string; card: Card & { isJoker?: boolean } }[]
  currentPlayer: string
  ledSuit: Suit | null
  tricks: Record<string, number>
  jokerTricksWon: Record<string, number>
  scores: { team0: number; team1: number }
  playerOrder: string[]
  teams: { team0: string[]; team1: string[] }
  round: number
  message: string
}

export function initJoker(playerIds: string[]): JokerState {
  // 54 card deck with 2 jokers
  const base = createDeck()
  const deck54: (Card & { isJoker?: boolean })[] = [
    ...base,
    { suit: 'spades' as Suit, rank: 'A', id: 'joker-red', isJoker: true },
    { suit: 'hearts' as Suit, rank: 'A', id: 'joker-black', isJoker: true },
  ]
  // Shuffle
  for (let i = deck54.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck54[i], deck54[j]] = [deck54[j], deck54[i]]
  }
  const perPlayer = Math.floor(deck54.length / playerIds.length)
  const hands: Record<string, (Card & { isJoker?: boolean })[]> = {}
  playerIds.forEach((id, i) => { hands[id] = deck54.slice(i * perPlayer, (i + 1) * perPlayer) })

  return {
    phase: 'trump_selection', hands, trump: null,
    currentTrick: [], currentPlayer: playerIds[0], ledSuit: null,
    tricks: Object.fromEntries(playerIds.map(id => [id, 0])),
    jokerTricksWon: Object.fromEntries(playerIds.map(id => [id, 0])),
    scores: { team0: 0, team1: 0 },
    playerOrder: playerIds,
    teams: { team0: [playerIds[0], playerIds[2]], team1: [playerIds[1], playerIds[3]] },
    round: 1, message: `${playerIds[0]}, select the trump suit!`,
  }
}

export function selectJokerTrump(state: JokerState, suit: Suit): JokerState {
  return { ...state, trump: suit, phase: 'playing', message: `Trump: ${suit}! Game on!` }
}

export function playJokerCard(state: JokerState, playerId: string, card: Card & { isJoker?: boolean }): JokerState {
  if (state.currentPlayer !== playerId) throw new Error('Not your turn')
  const hand = state.hands[playerId] || []
  if (!hand.find(c => c.id === card.id)) throw new Error('Card not in hand')

  const newHand = hand.filter(c => c.id !== card.id)
  const newTrick = [...state.currentTrick, { playerId, card }]
  const newLed = (state.currentTrick.length === 0 && !card.isJoker ? card.suit : state.ledSuit) as Suit | null
  const order = state.playerOrder
  const nextIdx = (order.indexOf(playerId) + 1) % order.length

  const newState: JokerState = { ...state, hands: { ...state.hands, [playerId]: newHand }, currentTrick: newTrick, ledSuit: newLed, currentPlayer: order[nextIdx] }
  if (newTrick.length === order.length) return resolveJokerTrick(newState)
  return newState
}

function resolveJokerTrick(state: JokerState): JokerState {
  const trick = state.currentTrick
  const led = state.ledSuit
  const trump = state.trump
  const rankVal = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0
  const hasJoker = trick.some(p => p.card.isJoker)

  let winner = trick[0]
  for (const p of trick.slice(1)) {
    if (p.card.isJoker) { winner = p; continue }
    if (winner.card.isJoker) continue
    const wTrump = trump && winner.card.suit === trump
    const pTrump = trump && p.card.suit === trump
    if (pTrump && !wTrump) { winner = p; continue }
    if (!pTrump && wTrump) continue
    if (led && p.card.suit === led && winner.card.suit === led && rankVal(p.card.rank) > rankVal(winner.card.rank)) winner = p
  }

  const newTricks = { ...state.tricks, [winner.playerId]: state.tricks[winner.playerId] + 1 }
  const newJokerTricks = hasJoker
    ? { ...state.jokerTricksWon, [winner.playerId]: state.jokerTricksWon[winner.playerId] + 1 }
    : state.jokerTricksWon

  const totalTricks = Object.values(newTricks).reduce((a, b) => a + b, 0)
  const maxTricks = Math.floor(state.hands[state.playerOrder[0]]?.length === 0 ? totalTricks : 999)
  const allHandsEmpty = state.playerOrder.every(id => (state.hands[id]?.length || 0) <= 1)

  if (allHandsEmpty) {
    const { teams } = state
    const t0 = teams.team0.reduce((s, id) => s + newTricks[id], 0)
    const t1 = teams.team1.reduce((s, id) => s + newTricks[id], 0)
    const j0 = teams.team0.reduce((s, id) => s + newJokerTricks[id], 0)
    const j1 = teams.team1.reduce((s, id) => s + newJokerTricks[id], 0)
    const s0 = state.scores.team0 + t0 + j0 * 2
    const s1 = state.scores.team1 + t1 + j1 * 2
    return { ...state, tricks: newTricks, jokerTricksWon: newJokerTricks, scores: { team0: s0, team1: s1 }, phase: 'round_over', currentTrick: [], ledSuit: null, currentPlayer: winner.playerId, message: `Round over! Team A: ${s0} | Team B: ${s1}` }
  }

  return { ...state, tricks: newTricks, jokerTricksWon: newJokerTricks, currentTrick: [], ledSuit: null, currentPlayer: winner.playerId }
}
