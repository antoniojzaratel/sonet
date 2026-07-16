-- ============================================================
-- SONET — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector for embeddings

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
  spotify_token   TEXT,
  spotify_refresh TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  ratings_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
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
-- RATINGS
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
  review          TEXT,
  liked           BOOLEAN DEFAULT FALSE,
  play_count      INT DEFAULT 1,
  last_played     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, content_id, content_type)
);

CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_content_id ON ratings(content_id);
CREATE INDEX idx_ratings_score ON ratings(score DESC);
CREATE INDEX idx_ratings_created ON ratings(created_at DESC);

-- ============================================================
-- EVENTS (User-Generated)
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL CHECK (event_type IN ('concert','listening_party','festival','meetup')),
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
-- AI — MUSIC DNA (User Taste Vector)
-- ============================================================

CREATE TABLE IF NOT EXISTS music_dna (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- pgvector embedding (256-dim) for fast cosine similarity search
  embedding             vector(256),

  -- Genre breakdown (top 10 genres with weights 0–1)
  top_genres            JSONB,    -- [{"genre":"rock","weight":0.82}, ...]

  -- Spotify audio feature averages
  avg_bpm               FLOAT,
  avg_energy            FLOAT,
  avg_valence           FLOAT,
  avg_danceability      FLOAT,
  avg_acousticness      FLOAT,
  avg_instrumentalness  FLOAT,
  avg_loudness          FLOAT,
  avg_speechiness       FLOAT,

  -- Behavioral signals
  listening_peak_hour   INT,      -- 0–23
  avg_track_duration_s  FLOAT,
  skip_rate             FLOAT,    -- 0–1
  repeat_rate           FLOAT,    -- 0–1
  discovery_rate        FLOAT,    -- how much new music vs familiar

  -- Cultural signals
  top_languages         JSONB,    -- [{"lang":"es","weight":0.60}, ...]
  top_eras              JSONB,    -- [{"decade":"2010s","weight":0.45}, ...]
  top_artists           JSONB,    -- top 20 artists with play_count
  top_tracks            JSONB,    -- top 50 track IDs for similarity lookup

  -- Metadata
  total_tracks_analyzed INT DEFAULT 0,
  computed_at           TIMESTAMPTZ DEFAULT NOW(),
  spotify_synced_at     TIMESTAMPTZ
);

-- Fast ANN search on embeddings
CREATE INDEX idx_music_dna_embedding ON music_dna USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- AI — COMPATIBILITY SCORES (Precomputed SVM output)
-- ============================================================

CREATE TABLE IF NOT EXISTS compatibility_scores (
  user_a          UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b          UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Overall SVM probability output (0–100)
  taste_score     FLOAT NOT NULL,

  -- Dimension breakdown
  rhythm_match    FLOAT,   -- BPM + energy + danceability similarity
  mood_match      FLOAT,   -- valence + acousticness similarity
  era_match       FLOAT,   -- decade overlap
  language_match  FLOAT,   -- language overlap
  genre_match     FLOAT,   -- genre vector cosine similarity
  discovery_match FLOAT,   -- both explorers or both loyalists

  -- Shared content
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

  -- Scoring breakdown (0–1 each)
  content_score       FLOAT,  -- cosine similarity to user DNA
  collab_score        FLOAT,  -- liked by taste-match users
  novelty_score       FLOAT,  -- not in user history
  trending_score      FLOAT,  -- rising in user's genre this week
  final_score         FLOAT,  -- weighted composite

  -- Human-readable explanation
  reason        TEXT,         -- "Your top match @carlos92 also loves this"
  reason_type   TEXT,         -- 'taste_match' | 'genre_fit' | 'trending' | 'discovery'

  -- User feedback
  reacted       BOOLEAN DEFAULT FALSE,
  reaction      TEXT CHECK (reaction IN ('loved','liked','skip','save_playlist')),
  reacted_at    TIMESTAMPTZ,

  -- Audio features of the recommended track (for UI display)
  bpm           FLOAT,
  energy        FLOAT,
  valence       FLOAT,

  PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_daily_recs_user ON daily_recommendations(user_id, date DESC);

-- Feedback log for model retraining
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  track_id      TEXT,
  reaction      TEXT,
  source        TEXT,    -- 'daily_rec' | 'discovery_roulette' | 'soundmatch'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SOUNDMATCH — Musical Dating Feature
-- ============================================================

CREATE TABLE IF NOT EXISTS soundmatch_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active            BOOLEAN DEFAULT TRUE,
  age               INT,
  age_min           INT DEFAULT 18,
  age_max           INT DEFAULT 45,
  location_radius_km INT DEFAULT 50,
  looking_for       TEXT[] DEFAULT ARRAY['concert_buddy'],  -- 'friendship','dating','concert_buddy'
  gender            TEXT,
  gender_preference TEXT[] DEFAULT ARRAY['any'],
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

-- Increment/decrement follower counts
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

-- Increment rating count on new rating
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

-- Increment event attendees
CREATE OR REPLACE FUNCTION increment_event_attendees(event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE events SET attendees_count = attendees_count + 1 WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- Detect SoundMatch mutual likes and create match
CREATE OR REPLACE FUNCTION check_soundmatch_mutual()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
  v_score   FLOAT;
  v_icebreaker TEXT;
BEGIN
  IF NEW.action IN ('like', 'super_like') THEN
    IF EXISTS (
      SELECT 1 FROM soundmatch_swipes
      WHERE swiper_id = NEW.target_id
        AND target_id = NEW.swiper_id
        AND action IN ('like', 'super_like')
    ) THEN
      -- Create conversation
      INSERT INTO conversations (participants)
      VALUES (ARRAY[NEW.swiper_id, NEW.target_id])
      RETURNING id INTO v_conv_id;

      -- Get compatibility score
      SELECT taste_score INTO v_score
      FROM compatibility_scores
      WHERE (user_a = LEAST(NEW.swiper_id, NEW.target_id) AND user_b = GREATEST(NEW.swiper_id, NEW.target_id));

      -- Store match (canonical order)
      INSERT INTO soundmatch_matches (user_a, user_b, taste_score, conversation_id, icebreaker)
      VALUES (
        LEAST(NEW.swiper_id, NEW.target_id),
        GREATEST(NEW.swiper_id, NEW.target_id),
        COALESCE(v_score, 0),
        v_conv_id,
        '¡Match! Tienen ' || ROUND(COALESCE(v_score, 0)::numeric, 0) || '% de compatibilidad musical 🎵'
      )
      ON CONFLICT DO NOTHING;

      -- Notify both users
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

-- Auto-update conversations.updated_at on new message
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
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soundmatch_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE soundmatch_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE soundmatch_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read profiles, only owner can update
CREATE POLICY "users_read_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Ratings: public reads, own writes
CREATE POLICY "ratings_read_all" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_write_own" ON ratings FOR ALL USING (auth.uid() = user_id);

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

-- Music DNA: owner + service role
CREATE POLICY "music_dna_owner" ON music_dna FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "music_dna_service" ON music_dna FOR ALL USING (auth.role() = 'service_role');

-- Daily recs: owner only
CREATE POLICY "daily_recs_owner" ON daily_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_recs_update" ON daily_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "daily_recs_service" ON daily_recommendations FOR INSERT USING (auth.role() = 'service_role');

-- SoundMatch: active profiles visible to all SoundMatch users
CREATE POLICY "soundmatch_read_active" ON soundmatch_profiles FOR SELECT USING (active = true);
CREATE POLICY "soundmatch_own" ON soundmatch_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "swipes_own" ON soundmatch_swipes FOR ALL USING (auth.uid() = swiper_id);
CREATE POLICY "matches_participant" ON soundmatch_matches FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "notifications_own" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "history_own" ON listening_history FOR ALL USING (auth.uid() = user_id);

-- Catalog tables are public read
CREATE POLICY "catalog_tracks_public" ON catalog_tracks FOR SELECT USING (true);
CREATE POLICY "catalog_albums_public" ON catalog_albums FOR SELECT USING (true);
CREATE POLICY "catalog_podcasts_public" ON catalog_podcasts FOR SELECT USING (true);
CREATE POLICY "catalog_concerts_public" ON catalog_concerts FOR SELECT USING (true);
CREATE POLICY "catalog_videos_public" ON catalog_music_videos FOR SELECT USING (true);
CREATE POLICY "audio_features_public" ON track_audio_features FOR SELECT USING (true);
CREATE POLICY "compat_scores_participant" ON compatibility_scores FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

ALTER TABLE catalog_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_concerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_music_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_audio_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_scores ENABLE ROW LEVEL SECURITY;
