'use client'
import { useState } from 'react'
import PlayingCard from './PlayingCard'
import { GameProps, Scoreboard, TrickArea, TurnIndicator, RoundOverlay, PlayerBar } from './GameBase'
import { Game420State, placeBid, selectTrump420, play420Card, init420 } from '@/lib/games/all-games'
import { Card, SUITS, SUIT_SYMBOL, Suit } from '@/lib/games/deck'

const SUIT_COLORS: Record<Suit, string> = { hearts: '#ef4444', diamonds: '#ef4444', spades: 'white', clubs: 'white' }

export default function Game420({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [selected, setSelected] = useState<Card | null>(null)
  const [acting, setActing] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [bidAmt, setBidAmt] = useState(5)

  const state = gameState as Game420State
  const myHand = (state.hands?.[playerId] || []).slice().sort((a, b) => {
    if (state.trump && a.suit === state.trump && b.suit !== state.trump) return -1
    if (state.trump && b.suit === state.trump && a.suit !== state.trump) return 1
    const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    if (si !== 0) return si
    const rv = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0
    return rv(a.rank) - rv(b.rank)
  })
  const isMyTurn = state.currentPlayer === playerId
  const isBidding = state.phase === 'bidding' && isMyTurn
  const isTrumpSelect = state.phase === 'trump_selection' && state.highestBidder === playerId
  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'

  async function bid(amount: number | 'pass') {
    if (acting) return
    setActing(true)
    try { await onUpdate(placeBid(state, playerId, amount)) }
    catch (e: any) { setErrMsg(e.message) }
    setActing(false)
  }

  async function chooseTrump(suit: Suit) {
    if (acting) return
    setActing(true)
    await onUpdate(selectTrump420(state, suit))
    setActing(false)
  }

  async function playCard(card: Card) {
    if (state.phase !== 'playing' || !isMyTurn || acting) return
    if (selected?.id !== card.id) { setSelected(card); return }
    setActing(true); setSelected(null); setErrMsg('')
    try { await onUpdate(play420Card(state, playerId, card)) }
    catch (e: any) { setErrMsg(e.message); setTimeout(() => setErrMsg(''), 3000) }
    setActing(false)
  }

  async function nextRound() {
    await onUpdate(init420(players.map(p => p.id)))
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', padding: '0 0 16px' }}>
      <Scoreboard entries={[
        ...players.map(p => ({ label: p.nickname, value: state.scores?.[p.id] || 0, highlight: p.id === state.highestBidder })),
        ...(state.trump ? [{ label: 'Trump', value: SUIT_SYMBOL[state.trump] + ' ' + state.trump }] : []),
        ...(state.currentBid > 0 ? [{ label: 'Bid', value: state.currentBid + ' tricks' }] : []),
      ]} />

      {/* Other players */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(players.length - 1, 3)}, 1fr)`, gap: 8, padding: '8px 16px' }}>
        {players.filter(p => p.id !== playerId).map(p => (
          <PlayerBar key={p.id} player={p} isActive={state.currentPlayer === p.id} isSelf={false}
            extra={`${state.tricks?.[p.id] || 0} tricks · bid: ${state.bids?.[p.id] ?? '?'}`} />
        ))}
      </div>

      {/* Bidding */}
      {isBidding && (
        <div className="glass" style={{ margin: '8px 16px', borderRadius: 16, padding: 16, textAlign: 'center', border: '1px solid rgba(201,162,39,0.3)' }}>
          <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Your Bid</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
            <button className="btn-ghost" onClick={() => setBidAmt(b => Math.max(5, b - 1))} style={{ padding: '6px 14px', fontSize: 18 }}>−</button>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'white', minWidth: 50, textAlign: 'center' }}>{bidAmt}</span>
            <button className="btn-ghost" onClick={() => setBidAmt(b => Math.min(13, b + 1))} style={{ padding: '6px 14px', fontSize: 18 }}>+</button>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn-gold" onClick={() => bid(bidAmt)} style={{ padding: '10px 24px' }}>Bid {bidAmt}</button>
            <button className="btn-ghost" onClick={() => bid('pass')}>Pass</button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 8 }}>Current highest: {state.currentBid || 'none'}</p>
        </div>
      )}

      {state.phase === 'bidding' && !isBidding && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 12 }}>
          ⏳ {currentPlayerName} is bidding... (current: {state.currentBid || 'none'})
        </div>
      )}

      {/* Trump selection */}
      {isTrumpSelect && (
        <div className="glass" style={{ margin: '8px 16px', borderRadius: 16, padding: 16, textAlign: 'center', border: '1px solid rgba(201,162,39,0.3)' }}>
          <div style={{ color: '#f0c040', fontWeight: 700, marginBottom: 12 }}>You won the bid! Choose trump:</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {SUITS.map(suit => (
              <button key={suit} className="btn-ghost" onClick={() => chooseTrump(suit as Suit)}
                style={{ fontSize: 28, padding: '12px 16px', color: SUIT_COLORS[suit as Suit], borderColor: SUIT_COLORS[suit as Suit] + '40' }}>
                {SUIT_SYMBOL[suit as Suit]}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.phase === 'trump_selection' && !isTrumpSelect && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 12 }}>
          ⏳ {players.find(p => p.id === state.highestBidder)?.nickname} is choosing trump...
        </div>
      )}

      {/* Trick */}
      {state.phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass" style={{ borderRadius: 16, padding: '16px 24px', minWidth: 240, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Trick {state.trump ? `· Trump: ${SUIT_SYMBOL[state.trump]}` : ''}
            </div>
            <TrickArea trick={state.currentTrick || []} players={players} small />
          </div>
        </div>
      )}

      {errMsg && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{errMsg}</div>}
      {state.phase === 'playing' && <TurnIndicator isMyTurn={isMyTurn} currentPlayerName={currentPlayerName} message={isMyTurn && selected ? 'Click again to play' : undefined} />}

      {/* Hand */}
      {state.phase === 'playing' && (
        <div style={{ padding: '0 12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
            Your hand ({myHand.length}) · {state.tricks?.[playerId] || 0} tricks won
            {state.trump && ` · Trump: ${SUIT_SYMBOL[state.trump]}`}
          </div>
          <div className="hand">
            {myHand.map((card, i) => {
              const isTrumpCard = state.trump && card.suit === state.trump
              return (
                <div key={card.id} style={{ position: 'relative' }}>
                  <PlayingCard card={card} selected={selected?.id === card.id}
                    disabled={!isMyTurn} onClick={() => playCard(card)} animDelay={i * 40} />
                  {isTrumpCard && <div style={{ position: 'absolute', top: -5, left: -3, background: '#c9a227', borderRadius: '50%', width: 12, height: 12, border: '1px solid #f0c040' }} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {state.phase === 'round_over' && (
        <RoundOverlay title="Round Over!" message={state.message} isHost={isHost} onNext={nextRound} onEnd={onEnd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                <span>{p.nickname}{p.id === state.highestBidder ? ' 🎯' : ''}</span>
                <span style={{ color: '#f0c040' }}>{state.tricks?.[p.id] || 0} tricks · {state.scores?.[p.id] || 0}pts</span>
              </div>
            ))}
          </div>
        </RoundOverlay>
      )}
    </div>
  )
}
