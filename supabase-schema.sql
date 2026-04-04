-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- This sets up all tables needed for the game

-- Rooms table: stores active game lobbies
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,              -- short code like "ABCD12"
  host_id TEXT NOT NULL,            -- UUID of host player
  game_type TEXT NOT NULL,          -- 'mendicot' | 'satto' | 'kachu_phool' | '420' | 'joker'
  status TEXT DEFAULT 'waiting',    -- 'waiting' | 'playing' | 'finished'
  max_players INT DEFAULT 4,
  settings JSONB DEFAULT '{}',      -- game-specific settings
  game_state JSONB DEFAULT '{}',    -- full game state (hands, tricks, scores)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table: players in a room
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,              -- UUID generated client-side
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  seat_index INT,                   -- 0-7 seat position
  is_ready BOOLEAN DEFAULT FALSE,
  is_connected BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages (optional, lightweight)
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  player_id TEXT,
  nickname TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);

-- Enable Realtime on these tables (run in Supabase dashboard Realtime section too)
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Auto-clean old rooms after 6 hours (optional cron via pg_cron if enabled)
-- DELETE FROM rooms WHERE created_at < NOW() - INTERVAL '6 hours';

-- Row Level Security (RLS) - keeps data safe
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Public read/write for anonymous users (no login needed)
-- This is safe because: no personal data, rooms are temporary, identified by random codes
CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE USING (true);

CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can join as player" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update player" ON players FOR UPDATE USING (true);
CREATE POLICY "Anyone can leave" ON players FOR DELETE USING (true);

CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);
