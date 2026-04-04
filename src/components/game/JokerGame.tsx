'use client'
import { useState } from 'react'
import PlayingCard from './PlayingCard'
import { GameProps, Scoreboard, TrickArea, TurnIndicator, RoundOverlay, PlayerBar } from './GameBase'
import { JokerState, selectJokerTrump, playJokerCard, initJoker } from '@/lib/games/all-games'
import { Card, SUITS, SUIT_SYMBOL, Suit } from '@/lib/games/deck'

const SUIT_COLORS: Record<Suit, string> = { hearts: '#ef4444', diamonds: '#ef4444', spades: 'white', clubs: 'white' }

export default function JokerGame({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [selected, setSelected] = useState<any>(null)
  const [acting, setActing] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const state = gameState as JokerState
  const myHand = (state.hands?.[playerId] || []).slice().sort((a: any, b: any) => {
    if (a.isJoker) return -1
    if (b.isJoker) return 1
    if (state.trump && a.suit === state.trump && b.suit !== state.trump) return -1
    if (state.trump && b.suit === state.trump && a.suit !== state.trump) return 1
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)
  })
  const isMyTurn = state.currentPlayer === playerId && state.phase === 'playing'
  const myTeam = state.teams?.team0?.includes(playerId) ? 'A' : 'B'
  const t0 = (state.teams?.team0 || []).reduce((s: number, id: string) => s + (state.tricks?.[id] || 0), 0)
  const t1 = (state.teams?.team1 || []).reduce((s: number, id: string) => s + (state.tricks?.[id] || 0), 0)
  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'

  async function chooseTrump(suit: Suit) {
    if (acting) return
    setActing(true)
    await onUpdate(selectJokerTrump(state, suit))
    setActing(false)
  }

  async function playCard(card: any) {
    if (!isMyTurn || acting) return
    if (selected?.id !== card.id) { setSelected(card); return }
    setActing(true); setSelected(null); setErrMsg('')
    try { await onUpdate(playJokerCard(state, playerId, card)) }
    catch (e: any) { setErrMsg(e.message); setTimeout(() => setErrMsg(''), 3000) }
    setActing(false)
  }

  async function nextRound() {
    const ids = players.map(p => p.id)
    const newState = initJoker(ids)
    newState.scores = state.scores
    newState.round = (state.round || 1) + 1
    await onUpdate(newState)
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', padding: '0 0 16px' }}>
      <Scoreboard entries={[
        { label: 'Team A', value: state.scores?.team0 || 0, highlight: myTeam === 'A' },
        { label: 'A tricks', value: t0 },
        ...(state.trump ? [{ label: 'Trump', value: SUIT_SYMBOL[state.trump] + ' ' + state.trump }] : []),
        { label: 'B tricks', value: t1 },
        { label: 'Team B', value: state.scores?.team1 || 0, highlight: myTeam === 'B' },
      ]} />

      {/* Trump selection */}
      {state.phase === 'trump_selection' && state.currentPlayer === playerId && (
        <div className="glass" style={{ margin: '8px 16px', borderRadius: 16, padding: 16, textAlign: 'center', border: '1px solid rgba(201,162,39,0.3)' }}>
          <div style={{ color: '#f0c040', fontWeight: 700, marginBottom: 12 }}>Choose the trump suit:</div>
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

      {state.phase === 'trump_selection' && state.currentPlayer !== playerId && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 16 }}>
          ⏳ {currentPlayerName} is choosing trump...
        </div>
      )}

      {/* Other players */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(players.length - 1, 3)}, 1fr)`, gap: 8, padding: '8px 16px' }}>
        {players.filter(p => p.id !== playerId).map(p => {
          const jt = state.jokerTricksWon?.[p.id] || 0
          return <PlayerBar key={p.id} player={p} isActive={state.currentPlayer === p.id} isSelf={false}
            extra={`${state.tricks?.[p.id] || 0} tricks${jt > 0 ? ` · ${jt} 🃏 joker` : ''}`} />
        })}
      </div>

      {/* Trick */}
      {state.phase === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass" style={{ borderRadius: 16, padding: '16px 24px', minWidth: 240, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase' }}>
              Trick · Trump: {state.trump ? SUIT_SYMBOL[state.trump] : '?'} · Jokers beat all!
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
            Your hand ({myHand.length}) · Team {myTeam} · {state.tricks?.[playerId] || 0} tricks
            {(state.jokerTricksWon?.[playerId] || 0) > 0 && ` · ${state.jokerTricksWon[playerId]} 🃏 joker tricks`}
          </div>
          <div className="hand">
            {myHand.map((card: any, i: number) => (
              <PlayingCard key={card.id} card={card} selected={selected?.id === card.id}
                disabled={!isMyTurn} onClick={() => playCard(card)} animDelay={i * 40} />
            ))}
          </div>
        </div>
      )}

      {state.phase === 'round_over' && (
        <RoundOverlay title="Round Over!" message={state.message} isHost={isHost} onNext={nextRound} onEnd={onEnd}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '8px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Team A</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>{state.scores?.team0}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t0} tricks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Team B</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>{state.scores?.team1}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t1} tricks</div>
            </div>
          </div>
        </RoundOverlay>
      )}
    </div>
  )
}
