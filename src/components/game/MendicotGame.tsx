'use client'
import { useState } from 'react'
import PlayingCard from './PlayingCard'
import { GameProps, Scoreboard, TrickArea, TurnIndicator, RoundOverlay, PlayerBar } from './GameBase'
import { MendicotState, playMendicotCard, getValidMendicotCards, initMendicot } from '@/lib/games/mendicot'
import { Card, SUITS } from '@/lib/games/deck'

export default function MendicotGame({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [selected, setSelected] = useState<Card | null>(null)
  const [acting, setActing] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const state = gameState as MendicotState
  const myHand = (state.hands?.[playerId] || []).slice().sort((a, b) => {
    const si = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
    if (si !== 0) return si
    const rv = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0
    return rv(a.rank) - rv(b.rank)
  })
  const validCards = state.phase === 'playing' ? getValidMendicotCards(state, playerId) : []
  const isMyTurn = state.currentPlayer === playerId && state.phase === 'playing'
  const myTeam = state.teams?.team0?.includes(playerId) ? 'A' : 'B'
  const t0 = (state.teams?.team0 || []).reduce((s: number, id: string) => s + (state.tricks?.[id] || 0), 0)
  const t1 = (state.teams?.team1 || []).reduce((s: number, id: string) => s + (state.tricks?.[id] || 0), 0)
  const m0 = (state.teams?.team0 || []).reduce((s: number, id: string) => s + (state.mendis?.[id] || 0), 0)
  const m1 = (state.teams?.team1 || []).reduce((s: number, id: string) => s + (state.mendis?.[id] || 0), 0)

  async function playCard(card: Card) {
    if (!isMyTurn || acting) return
    if (selected?.id !== card.id) { setSelected(card); return }
    setActing(true); setSelected(null); setErrMsg('')
    try {
      const newState = playMendicotCard(state, playerId, card)
      await onUpdate(newState)
    } catch (e: any) { setErrMsg(e.message); setTimeout(() => setErrMsg(''), 3000) }
    setActing(false)
  }

  async function nextRound() {
    const ids = players.map(p => p.id)
    const newState = initMendicot(ids, state.scores, (state.round || 1) + 1)
    await onUpdate(newState)
  }

  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', padding: '0 0 16px' }}>
      {/* Scores */}
      <Scoreboard entries={[
        { label: 'Team A rounds', value: state.scores?.team0 || 0, highlight: myTeam === 'A' },
        { label: 'Team A tricks', value: t0, highlight: myTeam === 'A' },
        { label: `Led Suit`, value: state.ledSuit ? state.ledSuit.toUpperCase() : '–' },
        { label: 'Team B tricks', value: t1, highlight: myTeam === 'B' },
        { label: 'Team B rounds', value: state.scores?.team1 || 0, highlight: myTeam === 'B' },
      ]} />

      {/* Other players */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(players.length - 1, 3)}, 1fr)`, gap: 8, padding: '8px 16px' }}>
        {players.filter(p => p.id !== playerId).map(p => (
          <PlayerBar key={p.id} player={p} isActive={state.currentPlayer === p.id} isSelf={false}
            extra={`${state.tricks?.[p.id] || 0} tricks · ${state.mendis?.[p.id] || 0} 🎴`} />
        ))}
      </div>

      {/* Current trick */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div className="glass" style={{ borderRadius: 16, padding: '16px 24px', marginBottom: 16, minWidth: 240, textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Trick</div>
          <TrickArea trick={state.currentTrick || []} players={players} small />
          {state.lastTrickWinner && (
            <div style={{ color: '#4ade80', fontSize: 12, marginTop: 8 }}>
              Last won by {players.find(p => p.id === state.lastTrickWinner)?.nickname}
            </div>
          )}
        </div>
      </div>

      {/* Turn + error */}
      {errMsg && <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{errMsg}</div>}
      <TurnIndicator isMyTurn={isMyTurn} currentPlayerName={currentPlayerName}
        message={isMyTurn && selected ? `Click again to play ${selected.rank}` : undefined} />

      {/* My hand */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
          Your hand ({myHand.length}) · Team {myTeam} · {state.tricks?.[playerId] || 0} tricks
        </div>
        <div className="hand">
          {myHand.map((card, i) => {
            const isValid = validCards.some(c => c.id === card.id)
            return (
              <PlayingCard
                key={card.id}
                card={card}
                selected={selected?.id === card.id}
                valid={isMyTurn && isValid}
                disabled={isMyTurn && !isValid}
                onClick={() => playCard(card)}
                animDelay={i * 40}
              />
            )
          })}
        </div>
      </div>

      {/* Round over */}
      {state.phase === 'round_over' && (
        <RoundOverlay
          title="Round Over!"
          message={state.message}
          isHost={isHost}
          onNext={nextRound}
          onEnd={onEnd}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '8px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Team A</div>
              <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{state.scores?.team0}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t0} tricks · {m0} 🎴</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Team B</div>
              <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{state.scores?.team1}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t1} tricks · {m1} 🎴</div>
            </div>
          </div>
        </RoundOverlay>
      )}
    </div>
  )
}
