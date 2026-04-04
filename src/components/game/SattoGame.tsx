'use client'
import { useState } from 'react'
import PlayingCard from './PlayingCard'
import { GameProps, TurnIndicator, RoundOverlay } from './GameBase'
import { SattoState, playSattoCard, getValidSattoCards, getTableDisplay, initSatto } from '@/lib/games/satto'
import { Card, SUITS, SUIT_SYMBOL, Suit } from '@/lib/games/deck'

const SUIT_COLOR_MAP: Record<Suit, string> = { hearts: '#ef4444', diamonds: '#ef4444', spades: 'white', clubs: 'white' }

export default function SattoGame({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [acting, setActing] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const state = gameState as SattoState
  const myHand = (state.hands?.[playerId] || []).slice().sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit))
  const validCards = getValidSattoCards(state, playerId)
  const isMyTurn = state.currentPlayer === playerId && state.phase === 'playing'
  const tableDisplay = getTableDisplay(state)
  const finishOrder = state.finished || []
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']
  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'

  async function play(card: Card | null) {
    if (!isMyTurn || acting) return
    setActing(true); setErrMsg('')
    try {
      const newState = playSattoCard(state, playerId, card)
      await onUpdate(newState)
    } catch (e: any) { setErrMsg(e.message); setTimeout(() => setErrMsg(''), 3000) }
    setActing(false)
  }

  async function nextRound() {
    const ids = players.map(p => p.id)
    await onUpdate(initSatto(ids))
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', padding: '0 0 16px' }}>
      {/* Table */}
      <div className="glass" style={{ margin: '12px', borderRadius: 16, padding: 14 }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Cards on Table</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SUITS.map(suit => (
            <div key={suit} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 10 }}>
              <div style={{ color: SUIT_COLOR_MAP[suit as Suit], fontSize: 16, marginBottom: 6 }}>
                {SUIT_SYMBOL[suit as Suit]} <span style={{ fontSize: 12, opacity: 0.7 }}>{suit}</span>
              </div>
              {tableDisplay[suit as Suit].length === 0
                ? <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Not started (need 7)</div>
                : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tableDisplay[suit as Suit].map(rank => (
                      <span key={rank} style={{ background: rank === '7' ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.12)', color: rank === '7' ? '#f0c040' : SUIT_COLOR_MAP[suit as Suit], borderRadius: 5, padding: '2px 7px', fontSize: 12, fontWeight: 700, border: `1px solid ${rank === '7' ? 'rgba(201,162,39,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                        {rank}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Players */}
      <div style={{ display: 'flex', gap: 8, padding: '0 12px', flexWrap: 'wrap', marginBottom: 8 }}>
        {players.map(p => {
          const pos = finishOrder.indexOf(p.id)
          const passes = state.passCount?.[p.id] || 0
          const handSize = state.hands?.[p.id]?.length || 0
          return (
            <div key={p.id} style={{ flex: '1 1 120px', background: state.currentPlayer === p.id ? 'rgba(201,162,39,0.12)' : 'rgba(0,0,0,0.25)', border: `1.5px solid ${state.currentPlayer === p.id ? 'rgba(201,162,39,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'white' }}>
                {pos >= 0 ? medals[pos] + ' ' : ''}{p.nickname}{p.id === playerId ? ' (you)' : ''}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>
                {pos >= 0 ? 'Finished!' : `${handSize} cards`}
                {passes > 0 && ` · ${passes}⚠️`}
              </div>
            </div>
          )
        })}
      </div>

      {errMsg && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>{errMsg}</div>}
      <TurnIndicator isMyTurn={isMyTurn} currentPlayerName={currentPlayerName} />

      {/* My hand */}
      <div style={{ flex: 1, padding: '0 12px' }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>Your hand ({myHand.length} cards)</div>
        <div className="hand">
          {myHand.map((card, i) => {
            const isValid = validCards.some(c => c.id === card.id)
            return (
              <PlayingCard key={card.id} card={card} valid={isMyTurn && isValid} disabled={isMyTurn && !isValid}
                onClick={() => isMyTurn && isValid ? play(card) : undefined} animDelay={i * 30} />
            )
          })}
        </div>
        {isMyTurn && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="btn-ghost" onClick={() => play(null)} style={{ fontSize: 13 }}>
              Pass {validCards.length > 0 ? '(⚠️ penalty!)' : '(no valid cards)'}
            </button>
          </div>
        )}
      </div>

      {state.phase === 'round_over' && (
        <RoundOverlay title="Round Over!" message="" isHost={isHost} onNext={nextRound} onEnd={onEnd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {finishOrder.map((pid, i) => {
              const p = players.find(pl => pl.id === pid)
              const passes = state.passCount?.[pid] || 0
              return (
                <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                  <span>{medals[i]} {p?.nickname}</span>
                  <span style={{ color: passes > 0 ? '#f87171' : '#4ade80' }}>{passes > 0 ? `${passes} penalties` : 'Clean!'}</span>
                </div>
              )
            })}
          </div>
        </RoundOverlay>
      )}
    </div>
  )
}
