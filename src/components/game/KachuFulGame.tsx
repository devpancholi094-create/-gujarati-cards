'use client'
import { useState } from 'react'
import PlayingCard from './PlayingCard'
import { GameProps, TurnIndicator, Scoreboard } from './GameBase'
import { KachuFulState, placeBidKachu, playKachuFulCard, getValidKachuFulCards, nextRoundKachu, TOTAL_ROUNDS } from '@/lib/games/kachuful'
import { Card, SUIT_SYMBOL, Suit, SUITS } from '@/lib/games/deck'

const SUIT_COLORS: Record<Suit, string> = { hearts: '#ef4444', diamonds: '#ef4444', spades: 'white', clubs: 'white' }
const SUIT_BG: Record<Suit, string> = { hearts: 'rgba(239,68,68,0.15)', diamonds: 'rgba(239,68,68,0.15)', spades: 'rgba(255,255,255,0.1)', clubs: 'rgba(255,255,255,0.1)' }

export default function KachuFulGame({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [acting, setActing] = useState(false)
  const [selected, setSelected] = useState<Card | null>(null)
  const [bidValue, setBidValue] = useState(0)
  const [errMsg, setErrMsg] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const state = gameState as KachuFulState
  const myHand = (state.hands?.[playerId] || []).slice().sort((a, b) => {
    if (a.suit === state.trump && b.suit !== state.trump) return -1
    if (b.suit === state.trump && a.suit !== state.trump) return 1
    const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    if (si !== 0) return si
    const rv = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0
    return rv(a.rank) - rv(b.rank)
  })

  const validCards = state.phase === 'playing' ? getValidKachuFulCards(state, playerId) : []
  const isMyTurn = state.currentPlayer === playerId && state.phase === 'playing'
  const isMyBidTurn = state.phase === 'bidding' && state.bidOrder?.[state.currentBidderIdx] === playerId
  const myBid = state.bids?.[playerId]
  const myTricks = state.tricksTaken?.[playerId] || 0
  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'
  const totalBids = Object.values(state.bids || {}).reduce((a: number, b: number) => a + b, 0)

  async function placeBid() {
    if (acting) return
    setActing(true); setErrMsg('')
    try {
      const newState = placeBidKachu(state, playerId, bidValue)
      await onUpdate(newState)
      setBidValue(0)
    } catch (e: any) { setErrMsg(e.message) }
    setActing(false)
  }

  async function playCard(card: Card) {
    if (!isMyTurn || acting) return
    if (selected?.id !== card.id) { setSelected(card); return }
    setActing(true); setSelected(null); setErrMsg('')
    try {
      const newState = playKachuFulCard(state, playerId, card)
      await onUpdate(newState)
    } catch (e: any) { setErrMsg(e.message); setTimeout(() => setErrMsg(''), 3000) }
    setActing(false)
  }

  async function goNextRound() {
    if (!isHost) return
    const newState = nextRoundKachu(state)
    await onUpdate(newState)
  }

  // Progress bar for rounds
  const roundProgress = ((state.round - 1) / TOTAL_ROUNDS) * 100

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', paddingBottom: 16 }}>

      {/* Round + trump header */}
      <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <span style={{ color: '#f0c040', fontWeight: 700, fontSize: 16 }}>Round {state.round}/{TOTAL_ROUNDS}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginLeft: 8 }}>{state.round} card{state.round > 1 ? 's' : ''} each</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Trump display */}
            <div style={{ background: SUIT_BG[state.trump as Suit], border: `1px solid ${SUIT_COLORS[state.trump as Suit]}40`, borderRadius: 10, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TRUMP</span>
              <span style={{ color: SUIT_COLORS[state.trump as Suit], fontSize: 20, fontWeight: 700 }}>{SUIT_SYMBOL[state.trump as Suit]}</span>
              <span style={{ color: SUIT_COLORS[state.trump as Suit], fontSize: 12, textTransform: 'capitalize' }}>{state.trump}</span>
            </div>
            <button onClick={() => setShowHistory(!showHistory)} className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>
              📊 Scores
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${roundProgress}%`, background: 'linear-gradient(90deg, #c9a227, #f0c040)', borderRadius: 2, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Score history modal */}
      {showHistory && (
        <div className="modal-bg" onClick={() => setShowHistory(false)}>
          <div className="modal" style={{ maxWidth: 500, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="font-title" style={{ color: '#f0c040', fontSize: 18 }}>Score History</h2>
              <button onClick={() => setShowHistory(false)} className="btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}>✕</button>
            </div>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px ' + players.map(() => '1fr').join(' '), gap: 8, marginBottom: 8 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>Rnd</div>
              {players.map(p => (
                <div key={p.id} style={{ color: p.id === playerId ? '#f0c040' : 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>
                  {p.nickname.slice(0, 6)}
                </div>
              ))}
            </div>
            {/* Rounds */}
            {(state.roundHistory || []).map(h => (
              <div key={h.round} style={{ display: 'grid', gridTemplateColumns: '40px ' + players.map(() => '1fr').join(' '), gap: 8, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>{h.round}</div>
                {players.map(p => {
                  const bid = h.bids[p.id] ?? 0
                  const tricks = h.tricks[p.id] ?? 0
                  const score = h.scores[p.id] ?? 0
                  const made = bid === tricks
                  return (
                    <div key={p.id} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: made ? '#4ade80' : '#f87171' }}>
                        {made ? '✓' : '✗'} {bid}→{tricks}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: made ? '#f0c040' : 'rgba(255,255,255,0.3)' }}>
                        +{score}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px ' + players.map(() => '1fr').join(' '), gap: 8, padding: '10px 0', borderTop: '2px solid rgba(201,162,39,0.3)', marginTop: 4 }}>
              <div style={{ color: '#f0c040', fontSize: 12, textAlign: 'center', fontWeight: 700 }}>Tot</div>
              {players.map(p => (
                <div key={p.id} style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#f0c040' }}>
                  {state.scores?.[p.id] || 0}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Players + bids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '10px 16px' }}>
        {players.map(p => {
          const bid = state.bids?.[p.id]
          const tricks = state.tricksTaken?.[p.id] || 0
          const isBidding = state.phase === 'bidding' && state.bidOrder?.[state.currentBidderIdx] === p.id
          const isActive = state.currentPlayer === p.id && state.phase === 'playing'
          const hasBid = bid !== undefined
          const made = hasBid && tricks === bid
          const over = hasBid && tricks > bid
          return (
            <div key={p.id} style={{
              background: isActive || isBidding ? 'rgba(201,162,39,0.12)' : 'rgba(0,0,0,0.25)',
              border: `1.5px solid ${isActive || isBidding ? 'rgba(201,162,39,0.5)' : p.id === playerId ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'white' }}>
                  {p.nickname} {p.id === playerId ? '(you)' : ''}
                  {isBidding && ' ⏳'}
                  {isActive && ' 🎯'}
                </span>
                <span style={{ color: '#f0c040', fontSize: 12, fontWeight: 700 }}>
                  {state.scores?.[p.id] || 0}pts
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {hasBid ? (
                  <>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Bid: <span style={{ color: 'white', fontWeight: 700 }}>{bid}</span></div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Won: <span style={{ color: over ? '#f87171' : made ? '#4ade80' : 'white', fontWeight: 700 }}>{tricks}</span></div>
                    {state.phase === 'playing' && (
                      <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        {state.hands?.[p.id]?.length || 0} left
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {state.phase === 'bidding' ? (isBidding ? 'Choosing...' : 'Waiting...') : '–'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bid summary */}
      {state.phase === 'playing' && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '4px 0' }}>
          Total bids: {totalBids} / {state.round} tricks available
          {totalBids === state.round && ' · Exactly matched!'}
          {totalBids < state.round && ` · ${state.round - totalBids} unclaimed`}
          {totalBids > state.round && ` · ${totalBids - state.round} overbid`}
        </div>
      )}

      {/* Bidding UI */}
      {isMyBidTurn && (
        <div className="glass" style={{ margin: '8px 16px', borderRadius: 16, padding: 18, textAlign: 'center', border: '1px solid rgba(201,162,39,0.4)' }}>
          <div style={{ color: '#f0c040', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Your Bid</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>
            How many tricks will you win? (0 to {state.round})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
            <button className="btn-ghost" onClick={() => setBidValue(b => Math.max(0, b - 1))} style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 20, padding: 0 }}>−</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: 'white', lineHeight: 1 }}>{bidValue}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>tricks</div>
            </div>
            <button className="btn-ghost" onClick={() => setBidValue(b => Math.min(state.round, b + 1))} style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 20, padding: 0 }}>+</button>
          </div>
          {/* Quick bid buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {Array.from({ length: state.round + 1 }, (_, i) => (
              <button key={i} onClick={() => setBidValue(i)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: bidValue === i ? '#c9a227' : 'rgba(255,255,255,0.08)', border: `1px solid ${bidValue === i ? '#f0c040' : 'rgba(255,255,255,0.15)'}`, color: bidValue === i ? 'black' : 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                {i}
              </button>
            ))}
          </div>
          <button className="btn-gold" onClick={placeBid} disabled={acting} style={{ width: '100%', padding: 12, fontSize: 15 }}>
            Bid {bidValue} trick{bidValue !== 1 ? 's' : ''} →
          </button>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 8 }}>
            Score if correct: {10 + bidValue * 2} pts · If wrong: 0 pts
          </p>
        </div>
      )}

      {state.phase === 'bidding' && !isMyBidTurn && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 12 }}>
          ⏳ {players.find(p => p.id === state.bidOrder?.[state.currentBidderIdx])?.nickname || '?'} is bidding...
        </div>
      )}

      {/* Current trick */}
      {state.phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div className="glass" style={{ borderRadius: 16, padding: '14px 20px', minWidth: 220, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Current Trick {state.ledSuit ? `· Led: ${SUIT_SYMBOL[state.ledSuit as Suit]}` : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {(state.currentTrick || []).map(play => (
                <div key={play.card.id} style={{ textAlign: 'center' }}>
                  <PlayingCard card={play.card} small />
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4 }}>
                    {players.find(p => p.id === play.playerId)?.nickname?.slice(0, 8) || '?'}
                  </div>
                </div>
              ))}
              {(state.currentTrick?.length === 0) && (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: '8px 0' }}>No cards played yet</div>
              )}
            </div>
            {state.lastTrickWinner && (
              <div style={{ color: '#4ade80', fontSize: 11, marginTop: 8 }}>
                Last: {players.find(p => p.id === state.lastTrickWinner)?.nickname} won
              </div>
            )}
          </div>
        </div>
      )}

      {errMsg && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 6 }}>{errMsg}</div>}

      {state.phase === 'playing' && (
        <TurnIndicator isMyTurn={isMyTurn} currentPlayerName={currentPlayerName}
          message={isMyTurn && selected ? `Click again to play ${selected.rank}` : undefined} />
      )}

      {/* My hand */}
      {(state.phase === 'playing' || state.phase === 'bidding') && myHand.length > 0 && (
        <div style={{ padding: '0 12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
            Your hand ({myHand.length} cards)
            {myBid !== undefined && ` · Bid: ${myBid} · Won: ${myTricks}`}
            {myBid !== undefined && myTricks === myBid && myBid > 0 && ' ✅'}
          </div>
          <div className="hand">
            {myHand.map((card, i) => {
              const isValid = validCards.some(c => c.id === card.id)
              const isTrumpCard = card.suit === state.trump
              return (
                <div key={card.id} style={{ position: 'relative' }}>
                  <PlayingCard
                    card={card}
                    selected={selected?.id === card.id}
                    valid={isMyTurn && isValid}
                    disabled={state.phase === 'playing' && isMyTurn && !isValid}
                    onClick={state.phase === 'playing' ? () => playCard(card) : undefined}
                    animDelay={i * 50}
                  />
                  {isTrumpCard && (
                    <div style={{ position: 'absolute', top: -5, right: -3, background: '#c9a227', borderRadius: '50%', width: 12, height: 12, border: '2px solid #f0c040' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Round over */}
      {state.phase === 'round_over' && (
        <div className="modal-bg">
          <div className="modal" style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
            <h2 className="font-title" style={{ color: '#f0c040', fontSize: 20, marginBottom: 6 }}>Round {state.round} Complete!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
              {state.round < TOTAL_ROUNDS ? `Next: Round ${state.round + 1} (${state.round + 1} cards each)` : 'Final round!'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {players.map(p => {
                const bid = state.bids?.[p.id] ?? 0
                const tricks = state.tricksTaken?.[p.id] ?? 0
                const roundScore = state.roundScores?.[p.id] ?? 0
                const made = bid === tricks
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: made ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', border: `1px solid ${made ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 10, padding: '10px 16px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: 14 }}>
                        {made ? '✅' : '❌'} {p.nickname} {p.id === playerId ? '(you)' : ''}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                        Bid {bid} → Won {tricks}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: made ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: 16 }}>
                        +{roundScore}
                      </div>
                      <div style={{ color: '#f0c040', fontSize: 12 }}>Total: {state.scores?.[p.id] || 0}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isHost ? (
                <button className="btn-gold" onClick={goNextRound} style={{ width: '100%', padding: 12 }}>
                  Round {state.round + 1} →
                </button>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Waiting for host to start next round...</p>
              )}
              <button className="btn-ghost" onClick={onEnd} style={{ fontSize: 13 }}>Back to Lobby</button>
            </div>
          </div>
        </div>
      )}

      {/* Game over */}
      {state.phase === 'game_over' && (
        <div className="modal-bg">
          <div className="modal" style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
            <h2 className="font-title" style={{ color: '#f0c040', fontSize: 24, marginBottom: 4 }}>Game Over!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>All 13 rounds complete!</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[...players].sort((a, b) => (state.scores?.[b.id] || 0) - (state.scores?.[a.id] || 0)).map((p, rank) => {
                const medals = ['🥇', '🥈', '🥉', '4️⃣']
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: rank === 0 ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${rank === 0 ? 'rgba(201,162,39,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '12px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{medals[rank]}</span>
                      <span style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>{p.nickname} {p.id === playerId ? '(you)' : ''}</span>
                    </div>
                    <span style={{ color: '#f0c040', fontWeight: 800, fontSize: 20 }}>{state.scores?.[p.id] || 0}</span>
                  </div>
                )
              })}
            </div>
            <button className="btn-gold" onClick={onEnd} style={{ width: '100%', padding: 12 }}>Back to Lobby</button>
          </div>
        </div>
      )}
    </div>
  )
}
