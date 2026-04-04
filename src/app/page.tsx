'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, generateRoomCode, getOrCreatePlayerId, getPlayerNickname, setPlayerNickname } from '@/lib/supabase/client'
import InstructionsModal from '@/components/game/Instructions'

const GAMES = [
  { id: 'mendicot', name: 'Mendicot', gujarati: 'મેંડીકોટ', emoji: '🃏', players: '4 players', desc: '2 teams · Tricks · Collect the 10s', color: '#c9a227', min: 4, max: 4 },
  { id: 'satto', name: 'Satto', gujarati: 'સત્તો', emoji: '7️⃣', players: '3–8 players', desc: 'Build sequences from 7♠ · Empty your hand', color: '#22c55e', min: 3, max: 8 },
  { id: 'kachuful', name: 'KachuFul', gujarati: 'કાચૂ ફૂલ', emoji: '🎰', players: '4 players', desc: 'Bid your tricks · 13 rounds · Judgment game!', color: '#ef4444', min: 4, max: 4 },
  { id: '420', name: '420', gujarati: 'ચારસો વીસ', emoji: '🎯', players: '4 players', desc: 'Bid tricks · Choose trump · Race to 420', color: '#8b5cf6', min: 4, max: 4 },
  { id: 'bluff', name: 'Bluff', gujarati: 'બ્લફ', emoji: '🎭', players: '2–8 players', desc: 'Play face-down · Lie about your cards · Call bluff!', color: '#f59e0b', min: 2, max: 8 },
  { id: 'joker', name: 'Joker Game', gujarati: 'જોકર ગેમ', emoji: '🎭', players: '4–6 players', desc: 'Wild Jokers as trump · Team battle!', color: '#06b6d4', min: 4, max: 6 },
]

export default function HomePage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [showInstructions, setShowInstructions] = useState<string | null>(null)

  useEffect(() => {
    const saved = getPlayerNickname()
    if (saved) setNickname(saved)
  }, [])

  async function createRoom() {
    if (!nickname.trim()) { setError('Enter your name first'); return }
    if (!selectedGame) { setError('Select a game first'); return }
    setLoading(true); setError('')
    try {
      const playerId = getOrCreatePlayerId()
      setPlayerNickname(nickname.trim())
      const roomCode = generateRoomCode()
      const game = GAMES.find(g => g.id === selectedGame)!

      const { error: e1 } = await supabase.from('rooms').insert({
        id: roomCode, host_id: playerId, game_type: selectedGame,
        max_players: game.max, status: 'waiting', game_state: {},
      })
      if (e1) throw e1

      const { error: e2 } = await supabase.from('players').upsert({
        id: playerId, room_id: roomCode, nickname: nickname.trim(),
        seat_index: 0, is_ready: false, is_connected: true,
      }, { onConflict: 'id' })
      if (e2) throw e2

      router.push(`/room/${roomCode}`)
    } catch (e: any) {
      setError(e.message || 'Failed to create room'); setLoading(false)
    }
  }

  async function joinRoom() {
    if (!nickname.trim()) { setError('Enter your name first'); return }
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Enter 6-character room code'); return }
    setLoading(true); setError('')
    try {
      const playerId = getOrCreatePlayerId()
      setPlayerNickname(nickname.trim())
      const { data: room, error: re } = await supabase.from('rooms').select('*, players(*)').eq('id', code).single()
      if (re || !room) throw new Error('Room not found!')
      if (room.status === 'playing') throw new Error('Game already started!')
      const alreadyIn = room.players.some((p: any) => p.id === playerId)
      if (!alreadyIn) {
        if (room.players.length >= room.max_players) throw new Error('Room is full!')
        const { error: pe } = await supabase.from('players').upsert({
          id: playerId, room_id: code, nickname: nickname.trim(),
          seat_index: room.players.length, is_ready: false, is_connected: true,
        }, { onConflict: 'id' })
        if (pe) throw pe
      } else {
        await supabase.from('players').update({ is_connected: true, nickname: nickname.trim() }).eq('id', playerId)
      }
      router.push(`/room/${code}`)
    } catch (e: any) {
      setError(e.message || 'Failed to join room'); setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      {showInstructions && <InstructionsModal gameType={showInstructions} onClose={() => setShowInstructions(null)} />}

      {/* Header */}
      <div className="text-center mb-10">
        <div style={{ fontSize: 56, marginBottom: 8 }}>🃏</div>
        <h1 className="font-title text-white mb-2" style={{ fontSize: 32, letterSpacing: '0.05em', color: '#f0c040' }}>
          Gujarati Card Games
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          ગુજરાતી પત્તાં રમત &nbsp;·&nbsp; Free &nbsp;·&nbsp; No login needed
        </p>
      </div>

      {/* Nickname input */}
      <div style={{ width: '100%', maxWidth: 420, marginBottom: 28 }}>
        <label style={{ display: 'block', color: '#4ade80', fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Your Nickname
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-dark"
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? createRoom() : joinRoom())}
            style={{ fontSize: 17 }}
          />
          {nickname && <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, color: '#4ade80', fontSize: 20 }}>✓</div>}
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 4, marginBottom: 24, width: '100%', maxWidth: 420 }}>
        {(['create', 'join'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 14, transition: 'all 0.2s', cursor: 'pointer', border: 'none', background: tab === t ? 'linear-gradient(135deg,#c9a227,#f0c040)' : 'transparent', color: tab === t ? '#1a0e00' : 'rgba(255,255,255,0.6)' }}>
            {t === 'create' ? '🎮 Create Room' : '🚪 Join Room'}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <div style={{ width: '100%', maxWidth: 640 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Select Game</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
            {GAMES.map(game => (
              <div key={game.id} className={`game-tile ${selectedGame === game.id ? 'active' : ''}`} onClick={() => setSelectedGame(game.id)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{game.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: 16 }}>{game.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{game.gujarati}</div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setShowInstructions(game.id) }}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>
                    Rules
                  </button>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 8 }}>{game.desc}</p>
                <div className="badge badge-gold" style={{ background: `${game.color}22`, color: game.color, borderColor: `${game.color}44` }}>{game.players}</div>
                {selectedGame === game.id && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#f0c040' }} />}
              </div>
            ))}
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
          <button className="btn-gold" onClick={createRoom} disabled={loading || !selectedGame || !nickname.trim()} style={{ width: '100%', fontSize: 16, padding: '14px' }}>
            {loading ? 'Creating...' : '🎮 Create Game Room'}
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 380 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Room Code</label>
          <input
            className="input-dark"
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="e.g. ABC123"
            maxLength={6}
            style={{ textAlign: 'center', fontSize: 32, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.2em', marginBottom: 16 }}
          />
          {error && <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
          <button className="btn-gold" onClick={joinRoom} disabled={loading || joinCode.length !== 6 || !nickname.trim()} style={{ width: '100%', fontSize: 16, padding: '14px' }}>
            {loading ? 'Joining...' : '🚪 Join Room'}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', marginTop: 12 }}>Ask your friend for their 6-character room code</p>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 40, color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center' }}>
        No login · No data stored · Rooms auto-close · Free forever
      </div>
    </div>
  )
}
