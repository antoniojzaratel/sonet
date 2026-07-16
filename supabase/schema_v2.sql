-- ============================================================
--  SONET v2 — AI, Dating & Music Catalog Extensions
--  Run AFTER schema.sql (or schema from Supabase auto-update)
-- ============================================================

-- ============================================================
-- MUSIC PROFILES — AI Feature Vectors
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

ALTER TABLE music_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view music profiles" ON music_profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own music profile" ON music_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- DATING — Interactions (like / skip)
-- ============================================================
CREATE TABLE IF NOT EXISTS date_interactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL CHECK (action IN ('like', 'skip', 'super_like')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_id)
);

CREATE INDEX idx_date_interactions_user ON date_interactions(user_id);
CREATE INDEX idx_date_interactions_target ON date_interactions(target_id);

ALTER TABLE date_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own interactions" ON date_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see received likes" ON date_interactions
  FOR SELECT USING (auth.uid() = target_id AND action = 'like');

-- ============================================================
-- DATING — Mutual matches (both liked each other)
-- ============================================================
CREATE TABLE IF NOT EXISTS date_matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taste_score  INT NOT NULL,       -- 0-100 compatibility
  matched_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)          -- canonical ordering
);

ALTER TABLE date_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matched users can see their match" ON date_matches
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Auto-create match when mutual like detected
CREATE OR REPLACE FUNCTION check_mutual_like()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  mutual_exists BOOLEAN;
  a UUID; b UUID;
  vec_a JSONB; vec_b JSONB;
BEGIN
  IF NEW.action != 'like' AND NEW.action != 'super_like' THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM date_interactions
    WHERE user_id = NEW.target_id AND target_id = NEW.user_id
    AND action IN ('like','super_like')
  ) INTO mutual_exists;

  IF mutual_exists THEN
    a := LEAST(NEW.user_id, NEW.target_id);
    b := GREATEST(NEW.user_id, NEW.target_id);

    SELECT feature_vector INTO vec_a FROM music_profiles WHERE user_id = a;
    SELECT feature_vector INTO vec_b FROM music_profiles WHERE user_id = b;

    INSERT INTO date_matches (user_a, user_b, taste_score)
    VALUES (a, b, 75)  -- score computed client-side and stored here
    ON CONFLICT DO NOTHING;

    -- Notify both users
    INSERT INTO notifications (user_id, type, actor_id, content)
    VALUES
      (NEW.user_id, 'match', NEW.target_id, '¡Tienes un nuevo match musical! 💘'),
      (NEW.target_id, 'match', NEW.user_id, '¡Tienes un nuevo match musical! 💘');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_date_interaction
  AFTER INSERT ON date_interactions
  FOR EACH ROW EXECUTE FUNCTION check_mutual_like();

-- ============================================================
-- DAILY RECOMMENDATIONS CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_recommendations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  track_id      TEXT NOT NULL,
  track_name    TEXT NOT NULL,
  artist_name   TEXT NOT NULL,
  album_name    TEXT,
  cover_image   TEXT,
  preview_url   TEXT,
  spotify_url   TEXT,
  confidence    INT NOT NULL,
  reason        TEXT NOT NULL,
  position      INT NOT NULL,      -- 1-10 ranking
  was_played    BOOLEAN DEFAULT FALSE,
  was_rated     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date, position)
);

CREATE INDEX idx_daily_recs_user_date ON daily_recommendations(user_id, date DESC);

ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recommendations" ON daily_recommendations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- MUSIC CATALOG — catalog_tracks (if not in v1)
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_tracks (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  artist_names    TEXT[] NOT NULL,
  artist_ids      TEXT[],
  album_id        TEXT,
  album_name      TEXT,
  duration_ms     INT,
  explicit        BOOLEAN DEFAULT FALSE,
  preview_url     TEXT,
  spotify_url     TEXT,
  cover_image     TEXT,
  release_date    DATE,
  popularity      INT DEFAULT 0,
  genres          TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS track_audio_features (
  track_id          TEXT PRIMARY KEY REFERENCES catalog_tracks(id) ON DELETE CASCADE,
  bpm               FLOAT,
  energy            FLOAT,
  valence           FLOAT,
  danceability      FLOAT,
  acousticness      FLOAT,
  instrumentalness  FLOAT,
  liveness          FLOAT,
  loudness          FLOAT,
  speechiness       FLOAT,
  musical_key       INT,
  mode              INT,
  time_signature    INT
);

CREATE TABLE IF NOT EXISTS catalog_albums (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  artist_names  TEXT[] NOT NULL,
  cover_image   TEXT,
  release_date  DATE,
  total_tracks  INT,
  spotify_url   TEXT,
  genres        TEXT[],
  popularity    INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog_concerts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  artist_names  TEXT[],
  venue_name    TEXT,
  city          TEXT,
  country       TEXT,
  latitude      FLOAT,
  longitude     FLOAT,
  date          TIMESTAMPTZ,
  ticket_url    TEXT,
  cover_image   TEXT,
  price_min     FLOAT,
  price_max     FLOAT,
  genres        TEXT[],
  is_sold_out   BOOLEAN DEFAULT FALSE,
  source        TEXT DEFAULT 'ticketmaster',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_music_videos (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  artist_names  TEXT[],
  track_id      TEXT REFERENCES catalog_tracks(id),
  youtube_url   TEXT NOT NULL,
  thumbnail     TEXT,
  duration_ms   INT,
  view_count    BIGINT DEFAULT 0,
  release_date  DATE
);

CREATE TABLE IF NOT EXISTS catalog_podcasts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  publisher     TEXT,
  description   TEXT,
  cover_image   TEXT,
  total_episodes INT DEFAULT 0,
  languages     TEXT[],
  spotify_url   TEXT
);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE date_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE date_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_recommendations;
