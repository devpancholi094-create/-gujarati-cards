'use client'
import { useState, useEffect } from 'react'
import { GameProps } from './GameBase'
import { BluffState, BluffCard, playBluffCards, callBluff, initBluff, BLUFF_RANKS } from '@/lib/games/bluff'
import { Rank, SUIT_SYMBOL, SUIT_COLOR } from '@/lib/games/deck'

function MiniCard({ card, selected, onClick, disabled }: { card: BluffCard; selected?: boolean; onClick?: () => void; disabled?: boolean }) {
  if (card.isJoker) return (
    <div onClick={!disabled ? onClick : undefined}
      style={{ width: 48, height: 70, borderRadius: 6, background: selected ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'linear-gradient(135deg,#4c1d95,#831843)', border: selected ? '2px solid #f0c040' : '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', transform: selected ? 'translateY(-12px)' : 'none', transition: 'all 0.15s', boxShadow: selected ? '0 8px 20px rgba(201,162,39,0.4)' : '0 2px 6px rgba(0,0,0,0.3)', opacity: disabled ? 0.5 : 1, fontSize: 22 }}>
      🃏
    </div>
  )
  const isRed = SUIT_COLOR[card.suit] === 'red'
  const sym = SUIT_SYMBOL[card.suit]
  return (
    <div onClick={!disabled ? onClick : undefined}
      style={{ width: 48, height: 70, borderRadius: 6, background: 'white', border: selected ? '2px solid #c9a227' : '1px solid #ddd', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3px 4px', cursor: disabled ? 'not-allowed' : 'pointer', transform: selected ? 'translateY(-12px)' : 'none', transition: 'all 0.15s', boxShadow: selected ? '0 8px 20px rgba(201,162,39,0.5)' : '0 2px 6px rgba(0,0,0,0.3)', opacity: disabled ? 0.5 : 1, userSelect: 'none' }}>
      <div style={{ color: isRed ? '#c0392b' : '#1a1a1a', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>
        <div>{card.rank}</div>
        <div>{sym}</div>
      </div>
      <div style={{ color: isRed ? '#c0392b' : '#1a1a1a', fontSize: 18, textAlign: 'center' }}>{sym}</div>
      <div style={{ color: isRed ? '#c0392b' : '#1a1a1a', fontSize: 11, fontWeight: 800, transform: 'rotate(180deg)', lineHeight: 1 }}>
        <div>{card.rank}</div>
        <div>{sym}</div>
      </div>
    </div>
  )
}

function FaceDownCard({ count }: { count: number }) {
  return (
    <div style={{ position: 'relative', width: 48 + Math.min(count - 1, 3) * 6, height: 70 }}>
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: i * 6, top: i * -2, width: 48, height: 70, borderRadius: 6, background: 'linear-gradient(135deg,#1a1a6e,#2d2d9e)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
      ))}
    </div>
  )
}

export default function BluffGame({ playerId, players, gameState, isHost, onUpdate, onEnd }: GameProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [claimedRank, setClaimedRank] = useState<Rank>('A')
  const [acting, setActing] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [showReveal, setShowReveal] = useState(false)
  const [showRankPicker, setShowRankPicker] = useState(false)

  const state = gameState as BluffState
  const myHand: BluffCard[] = state.hands?.[playerId] || []
  const isMyTurn = state.currentPlayer === playerId && state.phase === 'playing'
  const canCallBluff = state.lastPlay && state.lastPlay.playerId !== playerId && !state.finished?.includes(playerId) && state.phase === 'playing'
  const finished = state.finished || []
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']

  // Sort hand by rank then suit
  const sortedHand = [...myHand].sort((a, b) => {
    if (a.isJoker) return -1
    if (b.isJoker) return 1
    const rv = (r: string) => r === 'A' ? 14 : parseInt(r) || ({ J: 11, Q: 12, K: 13 } as any)[r] || 0
    return rv(b.rank) - rv(a.rank)
  })

  function toggleCard(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  async function submitPlay() {
    if (selectedIds.length === 0) { setErrMsg('Select 1–4 cards to play'); return }
    if (acting) return
    setActing(true); setErrMsg('')
    try {
      const newState = playBluffCards(state, playerId, selectedIds, claimedRank)
      await onUpdate(newState)
      setSelectedIds([])
      setShowRankPicker(false)
    } catch (e: any) { setErrMsg(e.message) }
    setActing(false)
  }

  async function handleCallBluff() {
    if (!canCallBluff || acting) return
    setActing(true); setErrMsg('')
    try {
      const newState = callBluff(state, playerId)
      await onUpdate(newState)
      setShowReveal(true)
      setTimeout(() => setShowReveal(false), 3000)
    } catch (e: any) { setErrMsg(e.message) }
    setActing(false)
  }

  async function newGame() {
    const ids = players.map(p => p.id)
    const newState = initBluff(ids)
    newState.scores = state.scores
    await onUpdate(newState)
  }

  const currentPlayerName = players.find(p => p.id === state.currentPlayer)?.nickname || '?'
  const lastPlayer = state.lastPlay ? players.find(p => p.id === state.lastPlay!.playerId)?.nickname : null

  return (
    <div style={{ minHeight: 'calc(100vh - 51px)', display: 'flex', flexDirection: 'column', paddingBottom: 16 }}>

      {/* Header */}
      <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="font-title" style={{ color: '#f0c040', fontSize: 15 }}>🎭 Bluff</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {state.pile?.length || 0} cards in pile · Round {state.round}
          </div>
        </div>
      </div>

      {/* Players grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '10px 14px' }}>
        {players.map(p => {
          const handSize = state.hands?.[p.id]?.length || 0
          const finishPos = finished.indexOf(p.id)
          const isActive = state.currentPlayer === p.id && state.phase === 'playing'
          const isLastPlayed = state.lastPlay?.playerId === p.id
          return (
            <div key={p.id} style={{
              background: isActive ? 'rgba(201,162,39,0.12)' : 'rgba(0,0,0,0.25)',
              border: `1.5px solid ${isActive ? 'rgba(201,162,39,0.5)' : p.id === playerId ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '10px 14px', transition: 'all 0.3s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'white' }}>
                    {finishPos >= 0 ? medals[finishPos] + ' ' : ''}{p.nickname}{p.id === playerId ? ' (you)' : ''}
                    {isActive && ' ⏳'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 }}>
                    {finishPos >= 0 ? 'Finished!' : `${handSize} cards`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#f0c040', fontSize: 12, fontWeight: 700 }}>{state.scores?.[p.id] || 0} wins</div>
                  {isLastPlayed && state.lastPlay && (
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>
                      played {state.lastPlay.count}× claimed "{state.lastPlay.claimedRank}"
                    </div>
                  )}
                </div>
              </div>
              {/* Card count bar */}
              {finishPos < 0 && (
                <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (handSize / 15) * 100)}%`, background: handSize <= 3 ? '#ef4444' : handSize <= 7 ? '#f0c040' : '#4ade80', borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pile + last play */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '10px 16px' }}>
        {/* Pile */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pile</div>
          {state.pile?.length > 0 ? (
            <FaceDownCard count={state.pile.length} />
          ) : (
            <div style={{ width: 48, height: 70, borderRadius: 6, border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>empty</div>
          )}
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>{state.pile?.length || 0} cards</div>
        </div>

        {/* Last play info */}
        {state.lastPlay && (
          <div className="glass" style={{ borderRadius: 14, padding: '12px 18px', textAlign: 'center', flex: 1, maxWidth: 220 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Last play</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>
              {state.lastPlay.count}× <span style={{ color: '#f0c040' }}>{state.lastPlay.claimedRank}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
              by {lastPlayer}
            </div>
            {canCallBluff && (
              <button
                onClick={handleCallBluff}
                disabled={acting}
                style={{ marginTop: 10, width: '100%', background: 'linear-gradient(135deg,#dc2626,#ef4444)', border: 'none', borderRadius: 10, padding: '10px', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', letterSpacing: '0.05em' }}>
                🎭 BLUFF!
              </button>
            )}
          </div>
        )}

        {!state.lastPlay && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', flex: 1 }}>
            No cards played yet
          </div>
        )}
      </div>

      {/* Bluff result banner */}
      {state.bluffResult && (
        <div style={{ margin: '0 14px 8px', borderRadius: 12, padding: '12px 16px', background: state.bluffResult.wasBluff ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.15)', border: `1px solid ${state.bluffResult.wasBluff ? 'rgba(220,38,38,0.4)' : 'rgba(34,197,94,0.3)'}`, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: state.bluffResult.wasBluff ? '#f87171' : '#4ade80', marginBottom: 4 }}>
            {state.bluffResult.wasBluff ? '🎭 BLUFF CAUGHT!' : '✅ HONEST PLAY!'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            Actual cards: {state.bluffResult.cards.map(c => c.isJoker ? '🃏' : `${c.rank}${SUIT_SYMBOL[c.suit]}`).join(', ')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            {players.find(p => p.id === state.bluffResult!.penaltyPlayer)?.nickname} picks up the pile!
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div style={{ textAlign: 'center', padding: '6px 16px' }}>
        {errMsg && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 6 }}>{errMsg}</div>}
        {isMyTurn ? (
          <div className="win-pulse" style={{ display: 'inline-block', background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.4)', borderRadius: 999, padding: '8px 20px', color: '#f0c040', fontWeight: 700, fontSize: 15 }}>
            🎯 Your turn! Select cards to play
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>⏳ {currentPlayerName}'s turn</div>
        )}
      </div>

      {/* My hand */}
      <div style={{ padding: '4px 12px', flex: 1 }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginBottom: 8 }}>
          Your hand ({myHand.length} cards)
          {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {sortedHand.map(card => (
            <MiniCard
              key={card.id}
              card={card}
              selected={selectedIds.includes(card.id)}
              onClick={() => isMyTurn ? toggleCard(card.id) : undefined}
              disabled={!isMyTurn}
            />
          ))}
        </div>
      </div>

      {/* Play controls */}
      {isMyTurn && (
        <div style={{ padding: '10px 14px' }}>
          {/* Claim rank picker */}
          <div className="glass" style={{ borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
              Claim rank ({selectedIds.length} card{selectedIds.length !== 1 ? 's' : ''} selected)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
              {BLUFF_RANKS.map(rank => (
                <button key={rank} onClick={() => setClaimedRank(rank as Rank)}
                  style={{ width: 38, height: 38, borderRadius: 8, background: claimedRank === rank ? 'linear-gradient(135deg,#c9a227,#f0c040)' : 'rgba(255,255,255,0.08)', border: `1px solid ${claimedRank === rank ? '#f0c040' : 'rgba(255,255,255,0.15)'}`, color: claimedRank === rank ? '#1a0e00' : 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {rank}
                </button>
              ))}
            </div>
            <button
              onClick={submitPlay}
              disabled={acting || selectedIds.length === 0}
              style={{ width: '100%', background: selectedIds.length > 0 ? 'linear-gradient(135deg,#c9a227,#f0c040)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, padding: '13px', color: selectedIds.length > 0 ? '#1a0e00' : 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 16, cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
              {selectedIds.length === 0 ? 'Select cards first' : `Play ${selectedIds.length} card${selectedIds.length > 1 ? 's' : ''} as "${claimedRank}s" →`}
            </button>
          </div>
        </div>
      )}

      {/* Round/game over */}
      {state.phase === 'game_over' && (
        <div className="modal-bg">
          <div className="modal" style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
            <h2 className="font-title" style={{ color: '#f0c040', fontSize: 22, marginBottom: 16 }}>Game Over!</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[...players].sort((a, b) => {
                const fa = finished.indexOf(a.id)
                const fb = finished.indexOf(b.id)
                return (fa === -1 ? 999 : fa) - (fb === -1 ? 999 : fb)
              }).map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: i === 0 ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? 'rgba(201,162,39,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{medals[i]}</span>
                    <span style={{ color: 'white', fontWeight: 600 }}>{p.nickname} {p.id === playerId ? '(you)' : ''}</span>
                  </div>
                  <span style={{ color: '#f0c040', fontWeight: 700 }}>{state.scores?.[p.id] || 0} wins</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {isHost && <button className="btn-gold" onClick={newGame} style={{ flex: 1, padding: 12 }}>Play Again</button>}
              <button className="btn-ghost" onClick={onEnd} style={{ flex: 1 }}>Lobby</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
