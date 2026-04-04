'use client'
import PlayingCard from './PlayingCard'
import { Card } from '@/lib/games/deck'

export interface GameProps {
  roomCode: string
  playerId: string
  nickname: string
  players: { id: string; nickname: string; seat_index: number }[]
  gameState: any
  isHost: boolean
  onUpdate: (state: any) => Promise<void>
  onEnd: () => void
}

// Shared scoreboard component
export function Scoreboard({ entries }: { entries: { label: string; value: string | number; highlight?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '8px 16px', flexWrap: 'wrap' }}>
      {entries.map((e, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '6px 14px', textAlign: 'center', border: e.highlight ? '1px solid rgba(201,162,39,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{e.label}</div>
          <div style={{ color: e.highlight ? '#f0c040' : 'white', fontWeight: 700, fontSize: 16 }}>{e.value}</div>
        </div>
      ))}
    </div>
  )
}

// Trick area showing played cards
export function TrickArea({ trick, players, small }: { trick: { playerId: string; card: Card }[]; players: { id: string; nickname: string }[]; small?: boolean }) {
  if (trick.length === 0) return (
    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: '20px 0' }}>Waiting for first card...</div>
  )
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
      {trick.map(play => (
        <div key={play.card.id} style={{ textAlign: 'center' }}>
          <PlayingCard card={play.card} small={small} />
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {players.find(p => p.id === play.playerId)?.nickname || '?'}
          </div>
        </div>
      ))}
    </div>
  )
}

// Player status bar
export function PlayerBar({ player, isActive, isSelf, extra }: { player: { nickname: string }; isActive: boolean; isSelf: boolean; extra?: string }) {
  return (
    <div style={{ background: isActive ? 'rgba(201,162,39,0.15)' : 'rgba(0,0,0,0.25)', border: `1.5px solid ${isActive ? 'rgba(201,162,39,0.5)' : isSelf ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '7px 12px', textAlign: 'center', transition: 'all 0.3s' }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: isActive ? '#f0c040' : 'white' }}>
        {player.nickname} {isSelf && '(you)'}
        {isActive && ' ⏳'}
      </div>
      {extra && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>{extra}</div>}
    </div>
  )
}

// Round over overlay
export function RoundOverlay({ title, message, children, onNext, onEnd, isHost }: {
  title: string; message: string; children?: React.ReactNode
  onNext?: () => void; onEnd: () => void; isHost: boolean
}) {
  return (
    <div className="modal-bg">
      <div className="modal" style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
        <h2 className="font-title" style={{ color: '#f0c040', fontSize: 22, marginBottom: 8 }}>{title}</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 20, lineHeight: 1.6 }}>{message}</p>
        {children}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {isHost && onNext && (
            <button className="btn-gold" onClick={onNext} style={{ width: '100%', padding: 12 }}>Next Round →</button>
          )}
          {!isHost && onNext && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Waiting for host to start next round...</p>
          )}
          <button className="btn-ghost" onClick={onEnd} style={{ fontSize: 13 }}>Back to Lobby</button>
        </div>
      </div>
    </div>
  )
}

// Turn indicator
export function TurnIndicator({ isMyTurn, currentPlayerName, message }: { isMyTurn: boolean; currentPlayerName: string; message?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 16px' }}>
      {message && <div style={{ color: '#4ade80', fontSize: 13, marginBottom: 6 }}>{message}</div>}
      {isMyTurn
        ? <div className="win-pulse" style={{ display: 'inline-block', background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.4)', borderRadius: 999, padding: '8px 20px', color: '#f0c040', fontWeight: 700, fontSize: 15 }}>
            🎯 Your turn!
          </div>
        : <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            ⏳ {currentPlayerName}'s turn
          </div>
      }
    </div>
  )
}
