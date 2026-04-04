'use client'
import { useState } from 'react'
import PlayingCard from './PlayingCard'
import { GameProps, Scoreboard, TrickArea, TurnIndicator, RoundOverlay, PlayerBar } from './GameBase'
import { KachuState, playKachuCard, getValidKachuCards, initKachu, penaltyValue } from '@/lib/games/all-games'
import { Card, SUITS } from '@/lib/games/deck'

export default function KachuGame({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [selected, setSelected] = useState<Card | null>(null)
  const [acting, setActing] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const state = gameState as KachuState
  const myHand = (state.hands?.[playerId] || []).slice().sort((a, b) => {
    const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    if (si !== 0) return si
    const rv = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0
    return rv(a.rank) - rv(b.rank)
  })
  const validCards = state.phase === 'playing' ? getValidKachuCards(state, playerId) : []
  const isMyTurn = state.currentPlayer === playerId && state.phase === 'playing'
  const myWonPenalty = (state.wonCards?.[playerId] || []).reduce((s: number, c: Card) => s + penaltyValue(c), 0)
  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'

  async function playCard(card: Card) {
    if (!isMyTurn || acting) return
    if (selected?.id !== card.id) { setSelected(card); return }
    setActing(true); setSelected(null); setErrMsg('')
    try {
      const newState = playKachuCard(state, playerId, card)
      await onUpdate(newState)
    } catch (e: any) { setErrMsg(e.message); setTimeout(() => setErrMsg(''), 3000) }
    setActing(false)
  }

  async function nextRound() {
    const ids = players.map(p => p.id)
    const newState = initKachu(ids)
    // carry over cumulative scores
    newState.scores = state.scores
    await onUpdate(newState)
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', padding: '0 0 16px' }}>
      {/* Scores */}
      <Scoreboard entries={[
        ...players.map(p => ({ label: p.nickname + (p.id === playerId ? ' (you)' : ''), value: state.scores?.[p.id] || 0 })),
        { label: '♥ broken?', value: state.heartsBroken ? 'Yes ♥' : 'No' },
      ]} />

      {/* Other players */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(players.length - 1, 3)}, 1fr)`, gap: 8, padding: '8px 16px' }}>
        {players.filter(p => p.id !== playerId).map(p => {
          const pts = (state.wonCards?.[p.id] || []).reduce((s: number, c: Card) => s + penaltyValue(c), 0)
          return <PlayerBar key={p.id} player={p} isActive={state.currentPlayer === p.id} isSelf={false} extra={`${pts} penalty pts · ${state.wonCards?.[p.id]?.length || 0} cards won`} />
        })}
      </div>

      {/* Trick area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="glass" style={{ borderRadius: 16, padding: '16px 24px', marginBottom: 16, minWidth: 240, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Current Trick {state.ledSuit ? `· Led: ${state.ledSuit}` : ''}
          </div>
          <TrickArea trick={state.currentTrick || []} players={players} small />
        </div>
        {!state.heartsBroken && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 12px' }}>
            ♥ Hearts not broken yet
          </div>
        )}
      </div>

      {errMsg && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{errMsg}</div>}
      <TurnIndicator isMyTurn={isMyTurn} currentPlayerName={currentPlayerName}
        message={isMyTurn && selected ? `Click again to play` : undefined} />

      {/* My hand */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
          Your hand ({myHand.length}) · {myWonPenalty} penalty pts this round
        </div>
        <div className="hand">
          {myHand.map((card, i) => {
            const isValid = validCards.some(c => c.id === card.id)
            const isPenalty = penaltyValue(card) > 0
            return (
              <div key={card.id} style={{ position: 'relative' }}>
                <PlayingCard card={card} selected={selected?.id === card.id} valid={isMyTurn && isValid}
                  disabled={isMyTurn && !isValid} onClick={() => playCard(card)} animDelay={i * 40} />
                {isPenalty && (
                  <div style={{ position: 'absolute', top: -6, right: -4, background: card.rank === 'Q' && card.suit === 'spades' ? '#c9a227' : '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {penaltyValue(card)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {state.phase === 'round_over' && (
        <RoundOverlay title="Round Over!" message={state.message} isHost={isHost} onNext={nextRound} onEnd={onEnd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                <span>{p.nickname} {p.id === playerId ? '(you)' : ''}</span>
                <span style={{ color: '#f0c040' }}>+{state.roundScores?.[p.id] || 0} pts (total: {state.scores?.[p.id] || 0})</span>
              </div>
            ))}
            {state.shooterMoon && <div style={{ color: '#f0c040', textAlign: 'center', marginTop: 8 }}>🌙 {players.find(p => p.id === state.shooterMoon)?.nickname} shot the moon!</div>}
          </div>
        </RoundOverlay>
      )}
    </div>
  )
}
