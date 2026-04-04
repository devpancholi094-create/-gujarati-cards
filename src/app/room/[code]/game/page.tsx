'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getOrCreatePlayerId, getPlayerNickname } from '@/lib/supabase/client'
import MendicotGame from '@/components/game/MendicotGame'
import SattoGame from '@/components/game/SattoGame'
import KachuFulGame from '@/components/game/KachuFulGame'
import Game420 from '@/components/game/Game420'
import JokerGame from '@/components/game/JokerGame'
import BluffGame from '@/components/game/BluffGame'

export default function GamePage() {
  const params = useParams()
  const roomCode = (params.code as string).toUpperCase()
  const router = useRouter()
  const playerId = getOrCreatePlayerId()
  const nickname = getPlayerNickname()

  const [room, setRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single()
    const { data: p } = await supabase.from('players').select('*').eq('room_id', roomCode).order('seat_index')
    if (r) setRoom(r)
    if (p) setPlayers(p)
    setLoading(false)
  }, [roomCode])

  useEffect(() => {
    load()
    const ch = supabase.channel(`game-${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, payload => {
        const r = payload.new as any
        setRoom(r)
        if (r.status === 'waiting') router.push(`/room/${roomCode}`)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomCode, load, router])

  async function updateState(newState: any) {
    await supabase.from('rooms').update({ game_state: newState }).eq('id', roomCode)
    setRoom((prev: any) => prev ? { ...prev, game_state: newState } : prev)
  }

  async function endGame() {
    await supabase.from('rooms').update({ status: 'waiting', game_state: {} }).eq('id', roomCode)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🃏</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>Dealing cards...</div>
    </div>
  )

  if (!room?.game_state || Object.keys(room.game_state).length === 0) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Game not started yet</p>
        <button className="btn-gold" onClick={() => router.push(`/room/${roomCode}`)}>Back to Lobby</button>
      </div>
    </div>
  )

  const props = { roomCode, playerId, nickname, players, gameState: room.game_state, isHost: room.host_id === playerId, onUpdate: updateState, onEnd: endGame }

  return (
    <div className="felt-bg" style={{ minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="font-title" style={{ color: '#f0c040', fontSize: 16, letterSpacing: '0.1em' }}>{roomCode}</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{nickname}</div>
        {room.host_id === playerId && (
          <button onClick={endGame} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
            End Game
          </button>
        )}
      </div>

      {room.game_type === 'mendicot' && <MendicotGame {...props} />}
      {room.game_type === 'satto' && <SattoGame {...props} />}
      {room.game_type === 'kachuful' && <KachuFulGame {...props} />}
      {room.game_type === '420' && <Game420 {...props} />}
      {room.game_type === 'joker' && <JokerGame {...props} />}
      {room.game_type === 'bluff' && <BluffGame {...props} />}
    </div>
  )
}
