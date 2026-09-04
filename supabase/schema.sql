-- ============================================================
-- SONET — Full Database Schema (canonical, consolidated)
-- Run this in Supabase SQL Editor. Supersedes schema_v2.sql,
-- which has been retired — see git history if you need it.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  birthdate       DATE,
  country         TEXT,
  spotify_id      TEXT UNIQUE,
  apple_music_id  TEXT UNIQUE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  ratings_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth tokens live here, NOT on `users` — `users` is publicly readable
-- (see users_read_all policy below) so a plaintext token column on it
-- would leak every user's Spotify credentials to every other user.
CREATE TABLE IF NOT EXISTS user_secrets (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spotify_token   TEXT,
  spotify_refresh TEXT,
  spotify_token_expires_at TIMESTAMPTZ,
  apple_music_token TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- ============================================================
-- MUSIC CATALOG — Songs / Tracks
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_tracks (
  id              TEXT PRIMARY KEY,          -- Spotify track ID
  isrc            TEXT UNIQUE,               -- Universal music ID
  name            TEXT NOT NULL,
  artist_names    TEXT[] NOT NULL,
  artist_ids      TEXT[],
  album_id        TEXT,
  album_name      TEXT,
  duration_ms     INT,
  explicit        BOOLEAN DEFAULT FALSE,
  preview_url     TEXT,
  spotify_url     TEXT,
  apple_url       TEXT,
  youtube_url     TEXT,
  cover_image     TEXT,
  release_date    DATE,
  popularity      INT DEFAULT 0,             -- Spotify popularity 0-100
  languages       TEXT[],                    -- detected spoken language(s)
  genres          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS track_audio_features (
  track_id          TEXT PRIMARY KEY REFERENCES catalog_tracks(id) ON DELETE CASCADE,
  bpm               FLOAT,
  energy            FLOAT,    -- 0.0–1.0
  valence           FLOAT,    -- 0.0–1.0  (happiness)
  danceability      FLOAT,    -- 0.0–1.0
  acousticness      FLOAT,    -- 0.0–1.0
  instrumentalness  FLOAT,    -- 0.0–1.0
  liveness          FLOAT,    -- 0.0–1.0  (recorded live?)
  loudness          FLOAT,    -- dBFS, typically -60–0
  speechiness       FLOAT,    -- 0.0–1.0  (spoken word content)
  musical_key       INT,      -- 0–11 (C=0, C#=1, ..., B=11)
  mode              INT,      -- 0=minor, 1=major
  time_signature    INT,      -- beats per bar (3,4,5,6,7)
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MUSIC CATALOG — Albums
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_albums (
  id              TEXT PRIMARY KEY,          -- Spotify album ID
  name            TEXT NOT NULL,
  artist_names    TEXT[] NOT NULL,
  artist_ids      TEXT[],
  album_type      TEXT,                      -- 'album','single','compilation'
  total_tracks    INT,
  cover_image     TEXT,
  release_date    DATE,
  spotify_url     TEXT,
  apple_url       TEXT,
  genres          TEXT[],
  popularity      INT DEFAULT 0,
  label           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MUSIC CATALOG — Podcasts / Episodes
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_podcasts (
  id              TEXT PRIMARY KEY,          -- Spotify show ID
  name            TEXT NOT NULL,
  description     TEXT,
  publisher       TEXT,
  cover_image     TEXT,
  total_episodes  INT DEFAULT 0,
  languages       TEXT[],
  spotify_url     TEXT,
  explicit        BOOLEAN DEFAULT FALSE,
  genres          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_podcast_episodes (
  id              TEXT PRIMARY KEY,
  podcast_id      TEXT REFERENCES catalog_podcasts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  duration_ms     INT,
  release_date    DATE,
  audio_url       TEXT,
  spotify_url     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MUSIC CATALOG — Concerts & Live Events
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_concerts (
  id              TEXT PRIMARY KEY,          -- Ticketmaster event ID
  name            TEXT NOT NULL,
  artist_names    TEXT[],
  venue_name      TEXT,
  venue_address   TEXT,
  city            TEXT,
  country         TEXT,
  latitude        FLOAT,
  longitude       FLOAT,
  date            TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  ticket_url      TEXT,
  cover_image     TEXT,
  price_min       FLOAT,
  price_max       FLOAT,
  currency        TEXT DEFAULT 'USD',
  genres          TEXT[],
  is_sold_out     BOOLEAN DEFAULT FALSE,
  source          TEXT DEFAULT 'ticketmaster',  -- ticketmaster | songkick | bandsintown
  raw_data        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MUSIC CATALOG — Music Videos
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_music_videos (
  id              TEXT PRIMARY KEY,          -- YouTube video ID
  name            TEXT NOT NULL,
  artist_names    TEXT[],
  track_id        TEXT REFERENCES catalog_tracks(id),
  youtube_url     TEXT NOT NULL,
  thumbnail       TEXT,
  duration_ms     INT,
  view_count      BIGINT DEFAULT 0,
  like_count      INT DEFAULT 0,
  release_date    DATE,
  genres          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RATINGS — with no-ties forced ranking
-- ============================================================

CREATE TABLE IF NOT EXISTS ratings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type    TEXT NOT NULL CHECK (content_type IN ('song','album','podcast','single','concert','music_video')),
  content_id      TEXT NOT NULL,
  content_name    TEXT NOT NULL,
  content_image   TEXT,
  artist_name     TEXT NOT NULL,
  album_name      TEXT,
  score           FLOAT NOT NULL CHECK (score >= 1.0 AND score <= 10.0),
  -- Strict rank order within (user_id, content_type). Lower = better (1 is #1).
  -- Never has ties — see lib/ranking.ts, which performs the pairwise
  -- comparison insert that assigns this on every new rating.
  rank_position   INT NOT NULL,
  bucket          TEXT NOT NULL CHECK (bucket IN ('liked','fine','disliked')),
  review          TEXT,
  liked           BOOLEAN DEFAULT FALSE,
  play_count      INT DEFAULT 1,
  last_played     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, content_id, content_type),
  -- Deferred so a single multi-row upsert can renumber a whole list
  -- (e.g. swap two positions) without tripping over itself mid-statement.
  UNIQUE (user_id, content_type, rank_position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_content_id ON ratings(content_id);
CREATE INDEX idx_ratings_score ON ratings(score DESC);
CREATE INDEX idx_ratings_created ON ratings(created_at DESC);
CREATE INDEX idx_ratings_user_type_rank ON ratings(user_id, content_type, rank_position);

-- Log of individual pairwise duels ("this or that") so a ranking insert
-- can be explained/undone. Not required to read the current order —
-- that's just ratings.rank_position — this is an audit trail.
CREATE TABLE IF NOT EXISTS rating_duels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type    TEXT NOT NULL,
  winner_content_id TEXT NOT NULL,
  loser_content_id  TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rating_duels_user ON rating_duels(user_id, content_type);

-- ============================================================
-- EVENTS (User-Generated)
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL CHECK (event_type IN ('concert','listening_party','watch_party','festival','meetup')),
  venue           TEXT,
  address         TEXT,
  latitude        FLOAT NOT NULL,
  longitude       FLOAT NOT NULL,
  date            TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  ticket_url      TEXT,
  cover_image     TEXT,
  attendees_count INT DEFAULT 0,
  max_attendees   INT,
  is_official     BOOLEAN DEFAULT FALSE,
  artist_names    TEXT[],
  price           FLOAT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- ============================================================
-- LISTENING PARTY — shared playback state for events of type
-- 'listening_party'/'watch_party'. Real synced low-latency audio across
-- devices isn't feasible without a paid Spotify Connect integration, so
-- this syncs Spotify 30s previews by elapsed time instead: every attendee's
-- client computes `elapsed = now() - started_at` and seeks their own local
-- player there, so everyone hears roughly the same moment of the same clip.
-- ============================================================

CREATE TABLE IF NOT EXISTS listening_party_state (
  event_id      UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  track_id      TEXT,
  track_name    TEXT,
  artist_name   TEXT,
  cover_image   TEXT,
  preview_url   TEXT,
  is_playing    BOOLEAN NOT NULL DEFAULT FALSE,
  started_at    TIMESTAMPTZ,             -- server time the current track started
  queue         JSONB NOT NULL DEFAULT '[]',  -- [{track_id, name, artist, cover_image, preview_url, added_by}], upcoming
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listening_party_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listening_party_state_read" ON listening_party_state FOR SELECT USING (true);
-- Playback control: the event creator, or anyone attending it.
CREATE POLICY "listening_party_state_write" ON listening_party_state FOR ALL USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM event_attendees WHERE event_id = listening_party_state.event_id AND user_id = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE listening_party_state;

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  message_type    TEXT DEFAULT 'text' CHECK (message_type IN ('text','song_share','event_share','rating_share')),
  metadata        JSONB,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- ============================================================
-- CONCERT ATTENDANCE — "conciertos a los que he ido" + map history
-- ============================================================

CREATE TABLE IF NOT EXISTS concert_attendance (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concert_id  TEXT NOT NULL REFERENCES catalog_concerts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, concert_id)
);

CREATE INDEX idx_concert_attendance_user ON concert_attendance(user_id);
CREATE INDEX idx_concert_attendance_concert ON concert_attendance(concert_id);

ALTER TABLE concert_attendance ENABLE ROW LEVEL SECURITY;
-- Public read so "amigos que van" can show on the map/event card; owner-only write.
CREATE POLICY "concert_attendance_read_all" ON concert_attendance FOR SELECT USING (true);
CREATE POLICY "concert_attendance_own_write" ON concert_attendance FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DAILY DROP — app-wide curated pick (distinct from the personalized
-- daily_recommendations/"Song of the Day" below). Same track for every
-- user; the community votes and can play + rate it.
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_drop (
  date          DATE PRIMARY KEY,
  content_type  TEXT NOT NULL CHECK (content_type IN ('artist','song','album')),
  content_id    TEXT NOT NULL,
  content_name  TEXT NOT NULL,
  artist_name   TEXT NOT NULL,
  cover_image   TEXT,
  preview_url   TEXT,
  spotify_url   TEXT,
  blurb         TEXT,          -- short "por qué lo elegimos"
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_drop_votes (
  date        DATE NOT NULL REFERENCES daily_drop(date) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote        TEXT NOT NULL CHECK (vote IN ('like','dislike','never_heard')),
  played      BOOLEAN DEFAULT FALSE,
  rated       BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, user_id)
);

ALTER TABLE daily_drop ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_drop_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_drop_read_all" ON daily_drop FOR SELECT USING (true);
CREATE POLICY "daily_drop_insert" ON daily_drop FOR INSERT WITH CHECK (true);
-- Votes are public-read (needed for the live "73% le gustó" tally) but only self-writable.
CREATE POLICY "daily_drop_votes_read_all" ON daily_drop_votes FOR SELECT USING (true);
CREATE POLICY "daily_drop_votes_own_write" ON daily_drop_votes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_drop_votes;

-- ============================================================
-- AI — MUSIC PROFILES (22-dim taste vector, matches lib/ai/tasteVector.ts)
-- ============================================================

CREATE TABLE IF NOT EXISTS music_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  feature_vector    JSONB,        -- MusicVector object (22 dimensions)
  top_genres        JSONB,        -- [{genre, percentage, color}]
  top_artists       JSONB,        -- [{id, name, image_url, play_count}]
  avg_bpm           FLOAT,
  energy_level      FLOAT,
  danceability      FLOAT,
  valence           FLOAT,
  listening_hours   FLOAT,
  spotify_synced_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI — COMPATIBILITY SCORES (cache of lib/ai/matchEngine.ts output)
-- ============================================================

CREATE TABLE IF NOT EXISTS compatibility_scores (
  user_a          UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b          UUID REFERENCES users(id) ON DELETE CASCADE,

  taste_score     FLOAT NOT NULL,   -- 0-100 composite, matchEngine.ts sigmoid output

  -- Dimension breakdown, matches matchEngine.ts's actual return shape
  audio_score     FLOAT,   -- weighted cosine similarity over audio-feature dims
  genre_score     FLOAT,   -- genre-vector overlap
  behavior_score  FLOAT,   -- rating/behavior similarity

  shared_genres   TEXT[],
  shared_artists  TEXT[],
  common_ratings  INT DEFAULT 0,   -- tracks both rated >= 7

  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)  -- store only once per pair (canonical order)
);

CREATE INDEX idx_compat_user_a ON compatibility_scores(user_a, taste_score DESC);
CREATE INDEX idx_compat_user_b ON compatibility_scores(user_b, taste_score DESC);

-- ============================================================
-- AI — DAILY RECOMMENDATIONS (Song of the Day)
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_recommendations (
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,

  track_id      TEXT REFERENCES catalog_tracks(id),
  track_name    TEXT NOT NULL,
  artist_name   TEXT NOT NULL,
  cover_image   TEXT,
  preview_url   TEXT,

  -- Scoring breakdown (0–1 each), matches lib/ai/recommendations.ts
  content_score       FLOAT,  -- cosine similarity to user vector
  collab_score        FLOAT,  -- liked by taste-match users
  novelty_score        FLOAT,  -- not in user history
  trending_score      FLOAT,  -- rising in user's genre this week
  final_score         FLOAT,  -- weighted composite
  confidence          INT,    -- 55-99, human-readable version of final_score

  reason        TEXT,         -- "Your top match @carlos92 also loves this"
  reason_type   TEXT,         -- 'taste_match' | 'genre_fit' | 'trending' | 'discovery'

  reacted       BOOLEAN DEFAULT FALSE,
  reaction      TEXT CHECK (reaction IN ('loved','liked','skip','save_playlist')),
  reacted_at    TIMESTAMPTZ,

  bpm           FLOAT,
  energy        FLOAT,
  valence       FLOAT,

  PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_daily_recs_user ON daily_recommendations(user_id, date DESC);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  track_id      TEXT,
  reaction      TEXT,
  source        TEXT,    -- 'daily_rec' | 'discovery_roulette' | 'soundmatch'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SOUNDMATCH — Musical Dating / Friends Feature (blind profile)
-- ============================================================

CREATE TABLE IF NOT EXISTS soundmatch_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- active = false is the "off — just recommendations, not even friends" state.
  active            BOOLEAN DEFAULT FALSE,
  age               INT,
  age_min           INT DEFAULT 18,
  age_max           INT DEFAULT 45,
  location_radius_km INT DEFAULT 50,
  looking_for       TEXT[] DEFAULT ARRAY['concert_buddy'],  -- 'friendship','dating','concert_buddy'
  gender            TEXT,
  gender_preference TEXT[] DEFAULT ARRAY['both'],  -- 'men','women','both'
  show_distance     BOOLEAN DEFAULT TRUE,
  show_age          BOOLEAN DEFAULT TRUE,
  last_active       TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soundmatch_swipes (
  swiper_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  target_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('like','pass','super_like')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (swiper_id, target_id)
);

CREATE TABLE IF NOT EXISTS soundmatch_matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a       UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b       UUID REFERENCES users(id) ON DELETE CASCADE,
  taste_score  FLOAT NOT NULL,
  matched_at   TIMESTAMPTZ DEFAULT NOW(),
  icebreaker   TEXT,   -- AI-generated opening line based on shared taste
  conversation_id UUID REFERENCES conversations(id),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX idx_soundmatch_matches_user_a ON soundmatch_matches(user_a);
CREATE INDEX idx_soundmatch_matches_user_b ON soundmatch_matches(user_b);

-- ============================================================
-- GAMES — Daily guess game (Wordle-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_game_puzzles (
  date            DATE PRIMARY KEY,
  content_type    TEXT NOT NULL CHECK (content_type IN ('genre','artist','album','song')),
  -- The answer columns are intentionally NOT covered by a public-read
  -- policy — clients never select them directly. Guess checking goes
  -- through check_daily_guess() below so the answer can't be read off
  -- the wire before someone solves it.
  answer_id       TEXT NOT NULL,
  answer_name     TEXT NOT NULL,
  hints           JSONB NOT NULL DEFAULT '[]',  -- progressive hints, revealed by attempt count
  cover_image     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_attempts (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  guesses         JSONB NOT NULL DEFAULT '[]',  -- ["guess text", ...] in order
  solved          BOOLEAN DEFAULT FALSE,
  attempt_count   INT DEFAULT 0,
  streak          INT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- Server-side guess check so the answer never round-trips to the client
-- until it's actually solved (or the reveal is explicitly requested).
CREATE OR REPLACE FUNCTION check_daily_guess(p_date DATE, p_guess TEXT)
RETURNS TABLE (correct BOOLEAN, answer_name TEXT) AS $$
DECLARE
  v_answer_id   TEXT;
  v_answer_name TEXT;
  v_correct     BOOLEAN;
BEGIN
  SELECT answer_id, daily_game_puzzles.answer_name
  INTO v_answer_id, v_answer_name
  FROM daily_game_puzzles WHERE date = p_date;

  v_correct := v_answer_id IS NOT NULL AND lower(trim(p_guess)) = lower(trim(v_answer_id))
               OR (v_answer_name IS NOT NULL AND lower(trim(p_guess)) = lower(trim(v_answer_name)));

  RETURN QUERY SELECT v_correct, CASE WHEN v_correct THEN v_answer_name ELSE NULL END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HITSTER — Live multiplayer chronological-timeline game
-- ============================================================
-- Real-time party game: a room of friends takes turns hearing a song and
-- placing it into their own chronological timeline by year; other players
-- can spend a token to "steal" it if they think the active player got the
-- slot wrong. First to `win_target` correctly-placed cards wins.

CREATE TABLE IF NOT EXISTS hitster_rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT UNIQUE NOT NULL,   -- short join code, e.g. 'AB3F9K'
  host_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','playing','finished')),
  win_target        INT NOT NULL DEFAULT 10,
  -- Shuffled draw pile, built once at room creation:
  -- [{track_id, name, artist, year, preview_url, cover_image}, ...]
  deck              JSONB NOT NULL DEFAULT '[]',
  deck_position     INT NOT NULL DEFAULT 0,   -- index of the next undrawn card
  current_round_id  UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hitster_players (
  room_id       UUID NOT NULL REFERENCES hitster_rooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Ordered chronologically, ascending by year:
  -- [{track_id, name, artist, year, cover_image}, ...]
  timeline      JSONB NOT NULL DEFAULT '[]',
  tokens        INT NOT NULL DEFAULT 2,   -- steal tokens remaining
  turn_order    INT NOT NULL,             -- 0-indexed seat, assigned atomically at join
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS hitster_rounds (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id            UUID NOT NULL REFERENCES hitster_rooms(id) ON DELETE CASCADE,
  round_number       INT NOT NULL,
  active_player_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id           TEXT NOT NULL,
  track_name         TEXT NOT NULL,
  artist_name        TEXT NOT NULL,
  year               INT NOT NULL,
  preview_url        TEXT,
  cover_image        TEXT,
  active_placement   INT,   -- index the active player chose in their own timeline, null until placed
  -- One entry per player who spent a token to steal: [{user_id, position}, ...]
  steals             JSONB NOT NULL DEFAULT '[]',
  status             TEXT NOT NULL DEFAULT 'placing' CHECK (status IN ('placing','stealing','resolved')),
  resolved_winner_id UUID REFERENCES users(id),   -- who the card ultimately went to, if anyone
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  resolved_at        TIMESTAMPTZ
);

CREATE INDEX idx_hitster_players_room ON hitster_players(room_id);
CREATE INDEX idx_hitster_rounds_room ON hitster_rounds(room_id, round_number DESC);

-- Atomically assigns the next open seat so two friends tapping "join" at
-- the same instant can never collide on turn_order (a plain client-side
-- "max + 1" read-then-write would race).
CREATE OR REPLACE FUNCTION hitster_join_room(p_code TEXT)
RETURNS hitster_players AS $$
DECLARE
  v_room_id UUID;
  v_seat    INT;
  v_player  hitster_players;
BEGIN
  SELECT id INTO v_room_id FROM hitster_rooms WHERE code = p_code AND status = 'lobby';
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Room not found or already started';
  END IF;

  SELECT COALESCE(MAX(turn_order), -1) + 1 INTO v_seat
  FROM hitster_players WHERE room_id = v_room_id;

  INSERT INTO hitster_players (room_id, user_id, turn_order)
  VALUES (v_room_id, auth.uid(), v_seat)
  ON CONFLICT (room_id, user_id) DO NOTHING
  RETURNING * INTO v_player;

  IF v_player IS NULL THEN
    SELECT * INTO v_player FROM hitster_players WHERE room_id = v_room_id AND user_id = auth.uid();
  END IF;

  RETURN v_player;
END;
$$ LANGUAGE plpgsql;

-- Atomically appends one steal attempt and spends the token, so two
-- players stealing within the same second (very likely — everyone's
-- listening to the same song at once) can't clobber each other's entry
-- via a client-side read-modify-write.
CREATE OR REPLACE FUNCTION hitster_submit_steal(p_round_id UUID, p_position INT)
RETURNS hitster_rounds AS $$
DECLARE
  v_room_id UUID;
  v_round   hitster_rounds;
BEGIN
  SELECT room_id INTO v_room_id FROM hitster_rounds WHERE id = p_round_id AND status = 'stealing';
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Round not open for steals';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM hitster_players WHERE room_id = v_room_id AND user_id = auth.uid() AND tokens > 0) THEN
    RAISE EXCEPTION 'No steal tokens remaining';
  END IF;

  IF EXISTS (
    SELECT 1 FROM hitster_rounds
    WHERE id = p_round_id AND steals @> jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text))
  ) THEN
    RAISE EXCEPTION 'Already stole this round';
  END IF;

  UPDATE hitster_players SET tokens = tokens - 1 WHERE room_id = v_room_id AND user_id = auth.uid();

  UPDATE hitster_rounds
  SET steals = steals || jsonb_build_array(jsonb_build_object('user_id', auth.uid()::text, 'position', p_position))
  WHERE id = p_round_id
  RETURNING * INTO v_round;

  RETURN v_round;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE hitster_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitster_rounds ENABLE ROW LEVEL SECURITY;

-- Room lookup by code has to work for someone who hasn't joined yet.
CREATE POLICY "hitster_rooms_read" ON hitster_rooms FOR SELECT USING (true);
CREATE POLICY "hitster_rooms_insert" ON hitster_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
-- Any seated player can advance room state (start a round, advance
-- deck_position, mark finished), not just the host — the client-side state
-- machine intentionally lets whichever device's countdown fires first drive
-- the game forward, so it doesn't stall if the host backgrounds their phone.
CREATE POLICY "hitster_rooms_participant_write" ON hitster_rooms FOR UPDATE USING (
  auth.uid() = host_id
  OR EXISTS (SELECT 1 FROM hitster_players WHERE room_id = hitster_rooms.id AND user_id = auth.uid())
);

CREATE POLICY "hitster_players_read" ON hitster_players FOR SELECT USING (true);
-- FOR ALL (not just UPDATE) so hitster_join_room()'s INSERT is covered too —
-- that function is SECURITY INVOKER, so its insert runs as the calling
-- user and is subject to this same RLS.
CREATE POLICY "hitster_players_own_write" ON hitster_players FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hitster_rounds_participant" ON hitster_rounds FOR ALL USING (
  EXISTS (SELECT 1 FROM hitster_players WHERE room_id = hitster_rounds.room_id AND user_id = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE hitster_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE hitster_players;
ALTER PUBLICATION supabase_realtime ADD TABLE hitster_rounds;

-- ============================================================
-- PERFECT LINEUP — daily festival-booking game
-- ============================================================
-- Given a pool of real artists (name/genre/popularity), the player picks
-- one headliner + N support acts; scored on genre synergy + popularity
-- balance as a "probabilidad de sold out".

CREATE TABLE IF NOT EXISTS lineup_challenges (
  date            DATE PRIMARY KEY,
  -- [{artist_name, genre, popularity, image}, ...]
  candidates      JSONB NOT NULL,
  headliner_slots INT NOT NULL DEFAULT 1,
  support_slots   INT NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lineup_attempts (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  -- {headliners: [artist_name], support: [artist_name]}
  lineup      JSONB NOT NULL,
  score       INT NOT NULL,   -- 0-100 "sold out" score
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE lineup_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineup_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineup_challenges_read_all" ON lineup_challenges FOR SELECT USING (true);
CREATE POLICY "lineup_challenges_insert" ON lineup_challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "lineup_attempts_read_all" ON lineup_attempts FOR SELECT USING (true);
CREATE POLICY "lineup_attempts_own_write" ON lineup_attempts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- WORLDWIDE RACE — first correct guess of the day wins #1
-- ============================================================
-- One song per day, same for everyone. Whoever's guess is confirmed
-- correct first (by server timestamp, via the RPC below) ranks #1.

CREATE TABLE IF NOT EXISTS race_puzzles (
  date         DATE PRIMARY KEY,
  track_id     TEXT NOT NULL,
  -- Not selected directly by clients — see check_race_guess().
  answer_name  TEXT NOT NULL,
  preview_url  TEXT,
  cover_image  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS race_attempts (
  date        DATE NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  correct_at  TIMESTAMPTZ,   -- null until they guess correctly
  guesses     INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, user_id)
);

CREATE INDEX idx_race_attempts_rank ON race_attempts(date, correct_at) WHERE correct_at IS NOT NULL;

ALTER TABLE race_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "race_puzzles_read_all" ON race_puzzles FOR SELECT USING (true);
CREATE POLICY "race_puzzles_insert" ON race_puzzles FOR INSERT WITH CHECK (true);
-- Public read so the live leaderboard (who's #1 right now) can render for everyone.
CREATE POLICY "race_attempts_read_all" ON race_attempts FOR SELECT USING (true);
CREATE POLICY "race_attempts_own_write" ON race_attempts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic guess check + first-correct-timestamp stamping, same reasoning as
-- check_daily_guess(): the answer never round-trips to the client, and
-- `correct_at` must be set exactly once (by whichever request is truly
-- first) for the worldwide ranking to be meaningful.
CREATE OR REPLACE FUNCTION check_race_guess(p_date DATE, p_guess TEXT)
RETURNS TABLE (correct BOOLEAN, rank INT) AS $$
DECLARE
  v_answer   TEXT;
  v_correct  BOOLEAN;
  v_rank     INT;
BEGIN
  SELECT answer_name INTO v_answer FROM race_puzzles WHERE date = p_date;
  v_correct := v_answer IS NOT NULL AND lower(trim(p_guess)) = lower(trim(v_answer));

  UPDATE race_attempts SET guesses = guesses + 1
  WHERE date = p_date AND user_id = auth.uid();

  IF v_correct THEN
    UPDATE race_attempts SET correct_at = NOW()
    WHERE date = p_date AND user_id = auth.uid() AND correct_at IS NULL;

    SELECT COUNT(*) + 1 INTO v_rank
    FROM race_attempts
    WHERE date = p_date AND correct_at IS NOT NULL
      AND correct_at < (SELECT correct_at FROM race_attempts WHERE date = p_date AND user_id = auth.uid());
  END IF;

  RETURN QUERY SELECT v_correct, v_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER PUBLICATION supabase_realtime ADD TABLE race_attempts;

-- ============================================================
-- STORIES — 24h ephemeral posts (image + optional 30s audio/song)
-- ============================================================
-- Media itself lives in Supabase Storage (bucket: 'stories', created by
-- the owner — see README manual). These rows just point at it.

CREATE TABLE IF NOT EXISTS stories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,          -- Supabase Storage URL, bucket 'stories'
  audio_url     TEXT,                   -- optional clip, same bucket
  caption       TEXT,
  track_id      TEXT,                   -- optional linked song
  track_name    TEXT,
  artist_name   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE INDEX idx_stories_user ON stories(user_id, created_at DESC);
CREATE INDEX idx_stories_expires ON stories(expires_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Public read like every other social table here (ratings, events) — the
-- client is responsible for filtering out expired rows (expires_at < now()).
CREATE POLICY "stories_read_all" ON stories FOR SELECT USING (true);
CREATE POLICY "stories_own_write" ON stories FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "story_views_read" ON story_views FOR SELECT USING (
  auth.uid() = viewer_id OR EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
);
CREATE POLICY "story_views_own_write" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

ALTER PUBLICATION supabase_realtime ADD TABLE stories;

-- Deletes stories past their 24h window. Not wired to a scheduler from
-- this repo — Supabase's pg_cron extension (Database → Extensions) can
-- call it on an interval:
--   SELECT cron.schedule('cleanup-expired-stories', '0 * * * *', 'SELECT cleanup_expired_stories()');
-- Until that's scheduled, expired stories just stay invisible (every
-- query already filters expires_at) — this only affects Storage cost.
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS VOID AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRUST & SAFETY — reports, blocks, self-service account deletion
-- ============================================================
-- Required for App Store approval on any app with UGC/dating
-- (Guideline 1.2) and account creation (Guideline 5.1.1(v)).

CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL CHECK (target_type IN ('user','rating','message','story')),
  target_id     TEXT NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN ('spam','harassment','inappropriate_content','fake_profile','other')),
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- A reporter can file and read their own reports; there's no admin role
-- wired yet, so review happens by querying this table directly (Supabase
-- dashboard / service role) until a moderation surface exists.
CREATE POLICY "reports_own_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_own_read" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- Moderators can read and resolve every report, not just their own. There's
-- deliberately no client-side way to grant this — see admin_users below.
CREATE POLICY "reports_admin_read" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "reports_admin_update" ON reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- ============================================================
-- ADMIN — moderator membership
-- ============================================================
-- Intentionally has no INSERT/UPDATE/DELETE policy at all: the only way to
-- become an admin is a row inserted directly via the Supabase SQL Editor
-- (service role), the standard bootstrap for "who is the first admin" that
-- no client-writable flag can solve safely — a self-serve `is_admin` column
-- on `users` would let any signed-in user grant themselves access, since
-- `users_update_own` already permits updating their own row.
CREATE TABLE IF NOT EXISTS admin_users (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- A signed-in user can only check whether *they themselves* are an admin
-- (to decide whether to show the moderation screen) — nothing else.
CREATE POLICY "admin_users_self_check" ON admin_users FOR SELECT USING (auth.uid() = user_id);

-- Blocks are private to the blocker (the blocked user isn't told).
CREATE POLICY "blocked_users_own" ON blocked_users FOR ALL
  USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- Self-service account deletion (Apple 5.1.1(v)). Cascades through every
-- FK in this schema that references users(id) ON DELETE CASCADE — which
-- is all of them — then removes the auth.users row itself so the person
-- can sign up again with the same email if they choose to.
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.users WHERE id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PUSH NOTIFICATIONS — device token registry
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT CHECK (platform IN ('ios','android')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_tokens_own" ON push_tokens FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('follow','rating_like','event_invite','match','soundmatch_match','daily_rec','comment')),
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  reference_id TEXT,
  content      TEXT NOT NULL,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ============================================================
-- USER LISTENING HISTORY (from Spotify sync)
-- ============================================================

CREATE TABLE IF NOT EXISTS listening_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id   TEXT,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  played_at  TIMESTAMPTZ NOT NULL,
  ms_played  INT,
  source     TEXT DEFAULT 'spotify'
);

CREATE INDEX idx_listening_history_user ON listening_history(user_id, played_at DESC);
CREATE INDEX idx_listening_history_track ON listening_history(track_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

CREATE OR REPLACE FUNCTION update_rating_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET ratings_count = ratings_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET ratings_count = ratings_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rating_count
AFTER INSERT OR DELETE ON ratings
FOR EACH ROW EXECUTE FUNCTION update_rating_count();

CREATE OR REPLACE FUNCTION increment_event_attendees(event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET attendees_count = attendees_count + 1 WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- Detect SoundMatch mutual likes and create match (real taste_score, not stubbed)
CREATE OR REPLACE FUNCTION check_soundmatch_mutual()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
  v_score   FLOAT;
BEGIN
  IF NEW.action IN ('like', 'super_like') THEN
    IF EXISTS (
      SELECT 1 FROM soundmatch_swipes
      WHERE swiper_id = NEW.target_id
        AND target_id = NEW.swiper_id
        AND action IN ('like', 'super_like')
    ) THEN
      INSERT INTO conversations (participants)
      VALUES (ARRAY[NEW.swiper_id, NEW.target_id])
      RETURNING id INTO v_conv_id;

      SELECT taste_score INTO v_score
      FROM compatibility_scores
      WHERE (user_a = LEAST(NEW.swiper_id, NEW.target_id) AND user_b = GREATEST(NEW.swiper_id, NEW.target_id));

      INSERT INTO soundmatch_matches (user_a, user_b, taste_score, conversation_id, icebreaker)
      VALUES (
        LEAST(NEW.swiper_id, NEW.target_id),
        GREATEST(NEW.swiper_id, NEW.target_id),
        COALESCE(v_score, 0),
        v_conv_id,
        '¡Match! Tienen ' || ROUND(COALESCE(v_score, 0)::numeric, 0) || '% de compatibilidad musical 🎵'
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO notifications (user_id, type, actor_id, content)
      VALUES
        (NEW.swiper_id, 'soundmatch_match', NEW.target_id, '¡Nuevo SoundMatch! Empiecen a hablar 🎵'),
        (NEW.target_id, 'soundmatch_match', NEW.swiper_id, '¡Nuevo SoundMatch! Empiecen a hablar 🎵');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soundmatch_mutual
AFTER INSERT ON soundmatch_swipes
FOR EACH ROW EXECUTE FUNCTION check_soundmatch_mutual();

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversation_updated
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soundmatch_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE soundmatch_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE soundmatch_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_game_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read profiles, only owner can update. No secrets live here.
CREATE POLICY "users_read_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Secrets: owner only, full stop.
CREATE POLICY "user_secrets_owner" ON user_secrets FOR ALL USING (auth.uid() = user_id);

-- Ratings: public reads (needed for feed/profile/taste-match), own writes
CREATE POLICY "ratings_read_all" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_write_own" ON ratings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "rating_duels_own" ON rating_duels FOR ALL USING (auth.uid() = user_id);

-- Events: public reads, own writes
CREATE POLICY "events_read_all" ON events FOR SELECT USING (true);
CREATE POLICY "events_write_own" ON events FOR ALL USING (auth.uid() = creator_id);

-- Conversations: only participants
CREATE POLICY "conversations_participants" ON conversations FOR ALL
  USING (auth.uid() = ANY(participants));

-- Messages: only conversation participants
CREATE POLICY "messages_participants" ON messages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participants)
  ));

-- Music profiles: public read (client-side matching needs to compare vectors), owner writes
CREATE POLICY "music_profiles_read_all" ON music_profiles FOR SELECT USING (true);
CREATE POLICY "music_profiles_own" ON music_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "compat_scores_participant" ON compatibility_scores FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "compat_scores_write" ON compatibility_scores FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "compat_scores_update" ON compatibility_scores FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Daily recs: owner only
CREATE POLICY "daily_recs_owner" ON daily_recommendations FOR ALL USING (auth.uid() = user_id);

-- SoundMatch: active profiles visible to all SoundMatch users
CREATE POLICY "soundmatch_read_active" ON soundmatch_profiles FOR SELECT USING (active = true);
CREATE POLICY "soundmatch_own" ON soundmatch_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "swipes_own" ON soundmatch_swipes FOR ALL USING (auth.uid() = swiper_id);
CREATE POLICY "matches_participant" ON soundmatch_matches FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Games: hints/metadata public, answer columns are never selected by
-- clients directly (enforced at the app layer + check_daily_guess()).
CREATE POLICY "puzzles_read_all" ON daily_game_puzzles FOR SELECT USING (true);
CREATE POLICY "game_attempts_own" ON game_attempts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "history_own" ON listening_history FOR ALL USING (auth.uid() = user_id);

-- Catalog tables are public read
ALTER TABLE catalog_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_concerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_music_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_audio_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_tracks_public" ON catalog_tracks FOR SELECT USING (true);
CREATE POLICY "catalog_albums_public" ON catalog_albums FOR SELECT USING (true);
CREATE POLICY "catalog_podcasts_public" ON catalog_podcasts FOR SELECT USING (true);
CREATE POLICY "catalog_podcast_episodes_public" ON catalog_podcast_episodes FOR SELECT USING (true);
CREATE POLICY "catalog_concerts_public" ON catalog_concerts FOR SELECT USING (true);
CREATE POLICY "catalog_videos_public" ON catalog_music_videos FOR SELECT USING (true);
CREATE POLICY "audio_features_public" ON track_audio_features FOR SELECT USING (true);
