'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, getOrCreatePlayerId, getPlayerNickname } from '@/lib/supabase/client'
import InstructionsModal from '@/components/game/Instructions'

const GAME_NAMES: Record<string, { name: string; emoji: string; gujarati: string }> = {
  mendicot: { name: 'Mendicot', emoji: '🃏', gujarati: 'મેંડીકોટ' },
  satto: { name: 'Satto', emoji: '7️⃣', gujarati: 'સત્તો' },
  kachuful: { name: 'KachuFul', emoji: '🎰', gujarati: 'કાચૂ ફૂલ' },
  '420': { name: '420', emoji: '🎯', gujarati: 'ચારસો વીસ' },
  joker: { name: 'Joker Game', emoji: '🎭', gujarati: 'જોકર ગેમ' },
  bluff: { name: 'Bluff', emoji: '🎭', gujarati: 'બ્લફ' },
}

const MIN_PLAYERS: Record<string, number> = { mendicot: 4, satto: 3, kachuful: 4, '420': 4, joker: 4 }

export default function RoomPage() {
  const params = useParams()
  const roomCode = (params.code as string).toUpperCase()
  const router = useRouter()
  const playerId = getOrCreatePlayerId()
  const nickname = getPlayerNickname()
  const channelRef = useRef<any>(null)

  const [room, setRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [showInstructions, setShowInstructions] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadRoom = useCallback(async () => {
    const { data: r } = await supabase.from('rooms').select('*').eq('id', roomCode).single()
    const { data: p } = await supabase.from('players').select('*').eq('room_id', roomCode).order('seat_index')
    if (r) { setRoom(r); if (r.status === 'playing') router.push(`/room/${roomCode}/game`) }
    if (p) setPlayers(p)
    setLoading(false)
  }, [roomCode, router])

  useEffect(() => {
    loadRoom()
    // Mark connected
    supabase.from('players').update({ is_connected: true }).eq('id', playerId).eq('room_id', roomCode)
    // Load chat
    supabase.from('messages').select('*').eq('room_id', roomCode).order('created_at').limit(50)
      .then(({ data }) => { if (data) setMessages(data) })

    // Subscribe to ALL changes - no refresh needed
    const ch = supabase.channel(`lobby-${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomCode}` }, payload => {
        const r = payload.new as any
        setRoom(r)
        if (r.status === 'playing') router.push(`/room/${roomCode}/game`)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomCode}` }, () => {
        loadRoom()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomCode}` }, payload => {
        setMessages(prev => [...prev.slice(-49), payload.new])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    channelRef.current = ch

    return () => {
      supabase.removeChannel(ch)
      supabase.from('players').update({ is_connected: false }).eq('id', playerId).eq('room_id', roomCode)
    }
  }, [roomCode, playerId, loadRoom, router])

  async function toggleReady() {
    const me = players.find(p => p.id === playerId)
    if (!me) return
    await supabase.from('players').update({ is_ready: !me.is_ready }).eq('id', playerId)
  }

  async function startGame() {
    if (!room) return
    const min = MIN_PLAYERS[room.game_type] || 2
    if (players.length < min) { setError(`Need at least ${min} players`); return }
    setError('')

    const playerIds = players.map(p => p.id)
    let initialState: any = {}
    try {
      if (room.game_type === 'mendicot') {
        const { initMendicot } = await import('@/lib/games/mendicot')
        initialState = initMendicot(playerIds)
      } else if (room.game_type === 'satto') {
        const { initSatto } = await import('@/lib/games/satto')
        initialState = initSatto(playerIds)
      } else if (room.game_type === 'kachuful') {
        const { initKachuFul } = await import('@/lib/games/kachuful')
        initialState = initKachuFul(playerIds)
      } else if (room.game_type === '420') {
        const { init420 } = await import('@/lib/games/all-games')
        initialState = init420(playerIds)
      } else if (room.game_type === 'bluff') {
        const { initBluff } = await import('@/lib/games/bluff')
        initialState = initBluff(playerIds)
      } else if (room.game_type === 'joker') {
        const { initJoker } = await import('@/lib/games/all-games')
        initialState = initJoker(playerIds)
      }
    } catch (e: any) { setError(e.message); return }

    await supabase.from('rooms').update({ status: 'playing', game_state: initialState }).eq('id', roomCode)
  }

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault()
    if (!chatMsg.trim()) return
    await supabase.from('messages').insert({ room_id: roomCode, player_id: playerId, nickname, content: chatMsg.trim() })
    setChatMsg('')
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const isHost = room?.host_id === playerId
  const me = players.find(p => p.id === playerId)
  const min = room ? (MIN_PLAYERS[room.game_type] || 2) : 2
  const gameInfo = room ? GAME_NAMES[room.game_type] : null

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>Loading room...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
      {showInstructions && room && <InstructionsModal gameType={room.game_type} onClose={() => setShowInstructions(false)} />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {gameInfo && <div style={{ fontSize: 40, marginBottom: 6 }}>{gameInfo.emoji}</div>}
        <h1 className="font-title" style={{ fontSize: 22, color: '#f0c040', marginBottom: 4 }}>
          {gameInfo?.name || 'Loading...'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{gameInfo?.gujarati}</p>
        <button onClick={() => setShowInstructions(true)} className="btn-ghost" style={{ marginTop: 10, fontSize: 13, padding: '6px 16px' }}>
          📋 How to Play
        </button>
      </div>

      {/* Room code */}
      <div className="glass" style={{ borderRadius: 20, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Share this code</p>
        <div style={{ fontSize: 44, fontFamily: 'monospace', fontWeight: 800, color: '#f0c040', letterSpacing: '0.15em', marginBottom: 12 }}>
          {roomCode}
        </div>
        <button className="btn-ghost" onClick={copyLink} style={{ fontSize: 13 }}>
          {copied ? '✓ Copied!' : '📋 Copy Link'}
        </button>
      </div>

      {/* Players */}
      <div className="glass" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: 'white', fontWeight: 600 }}>Players ({players.length}/{room?.max_players || '?'})</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Need {min} to start</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Array.from({ length: room?.max_players || 4 }).map((_, i) => {
            const p = players[i]
            return (
              <div key={i} className={`seat ${!p ? 'empty' : ''} ${p?.id === playerId ? 'me' : ''} ${p?.id === players[0]?.id ? 'active' : ''}`}>
                {p ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{p.nickname}</span>
                      {p.id === room?.host_id && <span style={{ fontSize: 14 }}>👑</span>}
                      {p.id === playerId && <span className="badge badge-green" style={{ fontSize: 10 }}>you</span>}
                    </div>
                    <div className={`badge ${p.is_ready ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 11 }}>
                      {p.is_ready ? '✓ Ready' : 'Not ready'}
                    </div>
                    {!p.is_connected && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>offline</div>}
                  </>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Seat {i + 1}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={toggleReady}
          className="btn-ghost"
          style={{ flex: 1, padding: 12, fontWeight: 700, borderColor: me?.is_ready ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)', color: me?.is_ready ? '#f87171' : '#4ade80' }}
        >
          {me?.is_ready ? '✗ Not Ready' : '✓ Ready'}
        </button>
        {isHost && (
          <button onClick={startGame} className="btn-gold" disabled={players.length < min} style={{ flex: 1, padding: 12 }}>
            🎮 Start!
          </button>
        )}
      </div>

      {isHost && players.length < min && (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
          Waiting for {min - players.length} more player{min - players.length !== 1 ? 's' : ''}...
        </p>
      )}
      {!isHost && (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
          Waiting for host to start the game...
        </p>
      )}

      {/* Chat */}
      <div className="glass" style={{ borderRadius: 20, padding: 16 }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Chat</p>
        <div style={{ height: 140, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {messages.length === 0
            ? <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No messages yet 👋</p>
            : messages.map((m: any) => (
              <div key={m.id} style={{ fontSize: 13 }}>
                <span style={{ color: '#f0c040', fontWeight: 600 }}>{m.nickname}: </span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{m.content}</span>
              </div>
            ))
          }
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendChat} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-dark"
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            placeholder="Type a message..."
            maxLength={100}
            style={{ fontSize: 13, padding: '8px 14px' }}
          />
          <button type="submit" className="btn-gold" style={{ padding: '8px 16px', fontSize: 13 }}>→</button>
        </form>
      </div>
    </div>
  )
}
