import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Generate a short human-readable room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Generate a player UUID stored in localStorage
export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('player_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('player_id', id)
  }
  return id
}

export function getPlayerNickname(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('player_nickname') || ''
}

export function setPlayerNickname(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('player_nickname', name)
  }
}
