'use client'
import { Card, SUIT_SYMBOL, SUIT_COLOR } from '@/lib/games/deck'

interface Props {
  card?: Card & { isJoker?: boolean }
  faceDown?: boolean
  selected?: boolean
  valid?: boolean
  disabled?: boolean
  small?: boolean
  onClick?: () => void
  style?: React.CSSProperties
  animDelay?: number
}

export default function PlayingCard({ card, faceDown, selected, valid, disabled, small, onClick, style, animDelay }: Props) {
  const base = small ? 'card card-sm' : 'card'

  if (faceDown || !card) {
    return <div className={`${base} back`} style={style} />
  }

  if (card.isJoker) {
    return (
      <div
        className={`${base} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
        style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', cursor: onClick && !disabled ? 'pointer' : 'default', ...style }}
        onClick={!disabled ? onClick : undefined}
      >
        <div style={{ fontSize: small ? 9 : 12, fontWeight: 700, color: 'white' }}>JK</div>
        <div style={{ fontSize: small ? 16 : 24, textAlign: 'center' }}>🃏</div>
        <div style={{ fontSize: small ? 9 : 12, fontWeight: 700, color: 'white', transform: 'rotate(180deg)' }}>JK</div>
      </div>
    )
  }

  const sym = SUIT_SYMBOL[card.suit]
  const isRed = SUIT_COLOR[card.suit] === 'red'
  const colorClass = isRed ? 'red' : 'black'

  return (
    <div
      className={`${base} ${selected ? 'selected' : ''} ${valid ? 'valid' : ''} ${disabled ? 'disabled' : ''}`}
      style={{ cursor: onClick && !disabled ? 'pointer' : 'default', animationDelay: animDelay ? `${animDelay}ms` : undefined, ...style }}
      onClick={!disabled ? onClick : undefined}
    >
      <div className={colorClass}>
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{sym}</div>
      </div>
      <div className={`card-center ${colorClass}`}>{sym}</div>
      <div className={`${colorClass} card-corner-bottom`}>
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{sym}</div>
      </div>
    </div>
  )
}
