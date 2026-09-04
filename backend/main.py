"""
Sonet ML Backend — FastAPI
Endpoints consumed by the mobile app via Supabase Edge Function proxy.
"""
import os
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header, Depends, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from music_dna import compute_and_store_dna
from svm_model import get_model, build_training_data, _pair_features
from recommendations import run_daily_batch, generate_daily_recommendation
from catalog_sync import run_full_sync

load_dotenv()

SUPABASE_URL    = os.environ["SUPABASE_URL"]
SUPABASE_KEY    = os.environ["SUPABASE_SERVICE_KEY"]   # service role — never in mobile app
SPOTIFY_CLIENT_ID     = os.environ.get("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
TICKETMASTER_KEY      = os.environ.get("TICKETMASTER_API_KEY", "")
YOUTUBE_KEY           = os.environ.get("YOUTUBE_API_KEY", "")

app = FastAPI(title="Sonet ML API", version="1.0.0")
scheduler = AsyncIOScheduler()


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── Request / Response Models ───────────────────────────────────────────────

class BuildDNARequest(BaseModel):
    user_id: str
    spotify_token: str

class CompatibilityRequest(BaseModel):
    user_a: str
    user_b: str

class ReactionRequest(BaseModel):
    user_id: str
    date: str
    reaction: str   # 'loved' | 'liked' | 'skip' | 'save_playlist'

class SoundMatchSwipe(BaseModel):
    swiper_id: str
    target_id: str
    action: str     # 'like' | 'pass' | 'super_like'


# ─── DNA Endpoints ────────────────────────────────────────────────────────────

@app.post("/dna/build")
async def build_dna(req: BuildDNARequest, supabase: Client = Depends(get_supabase)):
    """Build or rebuild a user's MusicDNA from Spotify data."""
    try:
        dna = await compute_and_store_dna(req.user_id, req.spotify_token, supabase)
        return {"status": "ok", "total_tracks_analyzed": dna.get("total_tracks_analyzed", 0)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Compatibility Endpoints ──────────────────────────────────────────────────

@app.post("/compatibility")
async def compute_compatibility(req: CompatibilityRequest, supabase: Client = Depends(get_supabase)):
    """Compute SVM-based taste compatibility between two users."""
    dna_resp = supabase.table("music_dna").select("*").in_("user_id", [req.user_a, req.user_b]).execute()
    rows = {r["user_id"]: r for r in (dna_resp.data or [])}

    if req.user_a not in rows or req.user_b not in rows:
        raise HTTPException(status_code=404, detail="DNA not computed for one or both users")

    dna_a, dna_b = rows[req.user_a], rows[req.user_b]
    vec_a = np.array(dna_a["embedding"], dtype=float)
    vec_b = np.array(dna_b["embedding"], dtype=float)

    model = get_model()
    result = model.predict(vec_a, vec_b, dna_a, dna_b)

    # compatibility_scores' actual columns match matchEngine.ts's shape
    # (audio_score/genre_score/behavior_score), not the richer per-dimension
    # breakdown CompatibilityResult carries — fold rhythm+mood (both
    # audio-derived) into audio_score, and treat discovery_match as the
    # behavioral-similarity signal.
    row = {
        "user_a": min(req.user_a, req.user_b),
        "user_b": max(req.user_a, req.user_b),
        "taste_score":    result.taste_score,
        "audio_score":    round((result.rhythm_match + result.mood_match) / 2, 1),
        "genre_score":    result.genre_match,
        "behavior_score": result.discovery_match,
        "shared_genres":  result.shared_genres,
        "shared_artists": result.shared_artists,
    }
    supabase.table("compatibility_scores").upsert(row).execute()

    return row


@app.get("/compatibility/top/{user_id}")
async def get_top_matches(user_id: str, limit: int = 30, supabase: Client = Depends(get_supabase)):
    """Return pre-computed top compatibility matches for a user."""
    r1 = supabase.table("compatibility_scores").select("*, user_b_profile:users!user_b(id,username,display_name,avatar_url)").eq("user_a", user_id).gte("taste_score", 40).order("taste_score", desc=True).limit(limit).execute()
    r2 = supabase.table("compatibility_scores").select("*, user_a_profile:users!user_a(id,username,display_name,avatar_url)").eq("user_b", user_id).gte("taste_score", 40).order("taste_score", desc=True).limit(limit).execute()

    matches = []
    for row in (r1.data or []):
        matches.append({**row, "matched_user": row.get("user_b_profile")})
    for row in (r2.data or []):
        matches.append({**row, "matched_user": row.get("user_a_profile")})

    matches.sort(key=lambda x: -x.get("taste_score", 0))
    return {"matches": matches[:limit]}


# ─── Recommendation Endpoints ─────────────────────────────────────────────────

@app.post("/recommendations/generate/{user_id}")
async def generate_rec(user_id: str, supabase: Client = Depends(get_supabase)):
    """Generate today's Song of the Day for a specific user."""
    rec = await generate_daily_recommendation(user_id, supabase)
    if not rec:
        existing = supabase.table("daily_recommendations").select("*").eq("user_id", user_id).order("date", desc=True).limit(1).execute()
        return {"status": "already_generated", "recommendation": (existing.data or [None])[0]}
    return {"status": "generated", "recommendation": rec}


@app.get("/recommendations/today/{user_id}")
async def get_today_rec(user_id: str, supabase: Client = Depends(get_supabase)):
    from datetime import date
    today = date.today().isoformat()
    resp = supabase.table("daily_recommendations").select("*").eq("user_id", user_id).eq("date", today).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="No recommendation for today yet")
    return resp.data[0]


@app.post("/recommendations/react")
async def react_to_recommendation(req: ReactionRequest, supabase: Client = Depends(get_supabase)):
    """Log user reaction to SOTD (loved/liked/skip/save)."""
    supabase.table("daily_recommendations").update({
        "reaction": req.reaction,
        "reacted": True,
        "reacted_at": datetime.utcnow().isoformat(),
    }).eq("user_id", req.user_id).eq("date", req.date).execute()

    # Log for model retraining
    rec_resp = supabase.table("daily_recommendations").select("track_id").eq("user_id", req.user_id).eq("date", req.date).execute()
    track_id = (rec_resp.data or [{}])[0].get("track_id")
    if track_id:
        supabase.table("recommendation_feedback").insert({
            "user_id": req.user_id,
            "track_id": track_id,
            "reaction": req.reaction,
            "source": "daily_rec",
        }).execute()

    return {"status": "ok"}


# ─── SoundMatch Endpoints ─────────────────────────────────────────────────────

@app.get("/soundmatch/candidates/{user_id}")
async def get_soundmatch_candidates(user_id: str, limit: int = 20, supabase: Client = Depends(get_supabase)):
    """
    Return SoundMatch candidates: active profiles not yet swiped,
    sorted by compatibility score.
    """
    # Users already swiped
    swiped = supabase.table("soundmatch_swipes").select("target_id").eq("swiper_id", user_id).execute()
    swiped_ids = {s["target_id"] for s in (swiped.data or [])}
    swiped_ids.add(user_id)

    # Active SoundMatch users
    profiles = supabase.table("soundmatch_profiles").select("user_id, users(id, username, display_name, avatar_url, bio)").eq("active", True).execute()

    candidate_ids = [p["user_id"] for p in (profiles.data or []) if p["user_id"] not in swiped_ids]

    # Get compatibility scores for candidates — user_id can be stored as
    # either user_a or user_b (canonical ordering), and so can each
    # candidate, so match on both sides explicitly rather than filtering by
    # a single column.
    candidate_set = set(candidate_ids)
    compat = supabase.table("compatibility_scores").select("*").or_(
        f"user_a.eq.{user_id},user_b.eq.{user_id}"
    ).execute()

    score_map: dict[str, float] = {}
    for row in (compat.data or []):
        other = row["user_b"] if row["user_a"] == user_id else row["user_a"]
        if other in candidate_set:
            score_map[other] = row.get("taste_score", 0)

    candidates = []
    for p in (profiles.data or []):
        uid = p["user_id"]
        if uid in swiped_ids:
            continue
        candidates.append({
            "user": p.get("users") or {"id": uid},
            "taste_score": score_map.get(uid, 0),
            "soundmatch_profile": {k: v for k, v in p.items() if k not in ("users", "user_id")},
        })

    candidates.sort(key=lambda x: -x["taste_score"])
    return {"candidates": candidates[:limit]}


# ─── Admin / Cron Endpoints ───────────────────────────────────────────────────

@app.post("/admin/retrain-svm")
async def retrain_svm(background_tasks: BackgroundTasks, supabase: Client = Depends(get_supabase)):
    """Trigger SVM retraining in the background."""
    async def _retrain():
        ratings_resp = supabase.table("ratings").select("user_id, content_id, score").execute()
        by_user: dict[str, list] = {}
        for r in (ratings_resp.data or []):
            by_user.setdefault(r["user_id"], []).append(r)

        dna_resp = supabase.table("music_dna").select("user_id, embedding").execute()
        embedding_map = {r["user_id"]: np.array(r["embedding"]) for r in (dna_resp.data or []) if r.get("embedding")}

        from itertools import combinations
        X_rows, y_labels = [], []
        for uid_a, uid_b in combinations(list(by_user.keys()), 2):
            if uid_a not in embedding_map or uid_b not in embedding_map:
                continue
            ratings_a = {r["content_id"]: r["score"] for r in by_user[uid_a]}
            ratings_b = {r["content_id"]: r["score"] for r in by_user[uid_b]}
            common = set(ratings_a) & set(ratings_b)
            if len(common) < 3:
                continue
            avg_delta = np.mean([abs(ratings_a[c] - ratings_b[c]) for c in common])
            label = 1 if avg_delta <= 2.5 else 0
            pair_feat = _pair_features(embedding_map[uid_a], embedding_map[uid_b])
            X_rows.append(pair_feat)
            y_labels.append(label)

        if len(X_rows) >= 20:
            model = get_model()
            result = model.train(np.array(X_rows), np.array(y_labels))
            print(f"[Retrain] {result}")

    background_tasks.add_task(_retrain)
    return {"status": "retraining_started"}


@app.post("/admin/daily-recommendations")
async def trigger_daily_recs(background_tasks: BackgroundTasks, supabase: Client = Depends(get_supabase)):
    """Manually trigger daily recommendation batch."""
    async def _run():
        result = await run_daily_batch(supabase)
        print(f"[Daily Recs] {result}")
    background_tasks.add_task(_run)
    return {"status": "batch_started"}


@app.post("/admin/catalog-sync")
async def trigger_catalog_sync(background_tasks: BackgroundTasks, supabase: Client = Depends(get_supabase)):
    """Manually trigger music catalog sync."""
    async def _run():
        result = await run_full_sync(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, TICKETMASTER_KEY, YOUTUBE_KEY, supabase)
        print(f"[Catalog Sync] {result}")
    background_tasks.add_task(_run)
    return {"status": "sync_started"}


# ─── Scheduled Jobs ───────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    db = get_supabase()

    # Daily recs at 00:05 UTC — pass the coroutine function directly (not
    # wrapped in asyncio.create_task) so APScheduler actually awaits it,
    # can report exceptions instead of losing them as "never retrieved",
    # and its max_instances overlap guard covers the real work.
    scheduler.add_job(run_daily_batch, "cron", hour=0, minute=5, args=[db])

    # Catalog sync at 03:00 UTC
    scheduler.add_job(
        run_full_sync, "cron", hour=3, minute=0,
        args=[SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, TICKETMASTER_KEY, YOUTUBE_KEY, db],
    )

    scheduler.start()
    print("[Sonet ML] Scheduler started")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sonet-ml"}
