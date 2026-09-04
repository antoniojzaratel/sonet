-- ============================================================
-- Sonet — bugfix patch, 2026-09-04
--
-- Applies the schema-level fixes from this session to an ALREADY-PROVISIONED
-- Supabase project (i.e. one that already ran the old supabase/schema.sql).
-- This file is idempotent — every statement is safe to run more than once,
-- so just paste the whole thing into the Supabase Dashboard's SQL Editor and
-- run it. It has already been folded into supabase/schema.sql for anyone
-- setting up a brand-new project from scratch; this patch exists only so an
-- existing database doesn't have to be dropped and recreated to pick up the
-- fixes below.
--
-- What this fixes:
--   1. music_dna table didn't exist — the Python backend reads/writes it in
--      three files (music_dna.py, main.py, recommendations.py) and every one
--      of those calls was failing with "relation does not exist".
--   2. follows table had NO Row Level Security at all — any signed-in client
--      could forge or delete arbitrary follow relationships between other
--      users.
--   3. update_follow_counts() was missing SECURITY DEFINER — its second
--      UPDATE (followers_count on the *other* user's row) was silently
--      filtered to 0 rows by RLS, so followers_count was permanently stuck.
--   4. check_soundmatch_mutual() was missing SECURITY DEFINER — RLS filtered
--      its own SELECT down to only the caller's swipe rows, so the mutual-
--      like check was always false and matches could never actually fire
--      for real users (a deeper issue than the INSERT-vs-UPDATE timing bug
--      also fixed here).
--   5. The soundmatch trigger only fired on INSERT — the app upserts swipes
--      (PK is swiper_id+target_id), so a re-swipe of the same pair landed as
--      an UPDATE and never fired the trigger at all.
-- ============================================================

-- ── 1. music_dna table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS music_dna (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  embedding             FLOAT8[],     -- 256-dim, backend/music_dna.py build_embedding()
  top_genres            JSONB,        -- [{genre, weight}]
  top_languages         JSONB,        -- [{lang, weight}]
  top_eras              JSONB,        -- [{decade, weight}]
  top_artists           JSONB,        -- [{id, name, play_count}]
  top_tracks            TEXT[],
  avg_bpm               FLOAT,
  avg_energy            FLOAT,
  avg_valence           FLOAT,
  avg_danceability      FLOAT,
  avg_acousticness      FLOAT,
  avg_instrumentalness  FLOAT,
  avg_loudness          FLOAT,
  avg_speechiness       FLOAT,
  listening_peak_hour   INT,
  avg_track_duration_s  FLOAT,
  skip_rate             FLOAT,
  repeat_rate           FLOAT,
  discovery_rate        FLOAT,
  total_tracks_analyzed INT DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE music_dna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "music_dna_own" ON music_dna;
CREATE POLICY "music_dna_own" ON music_dna FOR ALL USING (auth.uid() = user_id);

-- ── 2. follows: RLS was completely missing ──────────────────

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_read_all" ON follows;
CREATE POLICY "follows_read_all" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_write_own" ON follows;
CREATE POLICY "follows_write_own" ON follows FOR ALL USING (auth.uid() = follower_id);

-- ── 3. update_follow_counts(): add SECURITY DEFINER ─────────

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4 & 5. check_soundmatch_mutual(): add SECURITY DEFINER + ─
--          fire on UPDATE too ───────────────────────────────

CREATE OR REPLACE FUNCTION check_soundmatch_mutual()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
  v_score   FLOAT;
  v_matched BOOLEAN;
BEGIN
  IF NEW.action IN ('like', 'super_like') THEN
    IF EXISTS (
      SELECT 1 FROM soundmatch_swipes
      WHERE swiper_id = NEW.target_id
        AND target_id = NEW.swiper_id
        AND action IN ('like', 'super_like')
    ) THEN
      SELECT taste_score INTO v_score
      FROM compatibility_scores
      WHERE (user_a = LEAST(NEW.swiper_id, NEW.target_id) AND user_b = GREATEST(NEW.swiper_id, NEW.target_id));

      INSERT INTO soundmatch_matches (user_a, user_b, taste_score, conversation_id, icebreaker)
      VALUES (
        LEAST(NEW.swiper_id, NEW.target_id),
        GREATEST(NEW.swiper_id, NEW.target_id),
        COALESCE(v_score, 0),
        NULL,
        '¡Match! Tienen ' || ROUND(COALESCE(v_score, 0)::numeric, 0) || '% de compatibilidad musical 🎵'
      )
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS v_matched = ROW_COUNT;

      IF v_matched THEN
        INSERT INTO conversations (participants)
        VALUES (ARRAY[NEW.swiper_id, NEW.target_id])
        RETURNING id INTO v_conv_id;

        UPDATE soundmatch_matches SET conversation_id = v_conv_id
        WHERE user_a = LEAST(NEW.swiper_id, NEW.target_id) AND user_b = GREATEST(NEW.swiper_id, NEW.target_id);

        INSERT INTO notifications (user_id, type, actor_id, content)
        VALUES
          (NEW.swiper_id, 'soundmatch_match', NEW.target_id, '¡Nuevo SoundMatch! Empiecen a hablar 🎵'),
          (NEW.target_id, 'soundmatch_match', NEW.swiper_id, '¡Nuevo SoundMatch! Empiecen a hablar 🎵');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_soundmatch_mutual ON soundmatch_swipes;
CREATE TRIGGER trigger_soundmatch_mutual
AFTER INSERT OR UPDATE OF action ON soundmatch_swipes
FOR EACH ROW EXECUTE FUNCTION check_soundmatch_mutual();

-- ============================================================
-- Done. Sanity check afterwards:
--   select tablename, rowsecurity from pg_tables
--   where tablename in ('follows', 'music_dna');           -- both should be true
--
--   select proname, prosecdef from pg_proc
--   where proname in ('update_follow_counts', 'check_soundmatch_mutual');  -- both prosecdef=true
-- ============================================================
