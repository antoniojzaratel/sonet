"""
Daily Song-of-the-Day Recommendation Engine
Hybrid: content-based (DNA cosine) + collaborative filtering + novelty + trending
"""
import numpy as np
from datetime import date, timedelta
from typing import Optional
from supabase import Client
from music_dna import build_embedding, AUDIO_SLICE, GENRE_SLICE


WEIGHTS = {
    "content":     0.40,   # cosine(user_dna, track_features_vec)
    "collab":      0.35,   # rated >= 7.5 by users with taste_score > 70
    "novelty":     0.15,   # not in user's history
    "trending":    0.10,   # rising in user's top genres this week
}


def _track_to_vector(track: dict, features: dict) -> np.ndarray:
    """Map a track + its audio features into a comparable DNA-shaped vector."""
    vec = np.zeros(256)

    # Genre slots (0–49): set genres from track.genres
    for genre in (track.get("genres") or [])[:10]:
        from music_dna import GENRE_INDEX
        idx = GENRE_INDEX.get(genre.lower())
        if idx is not None:
            vec[idx] = 1.0 / max(1, len(track.get("genres", [1])))

    # Audio slots (50–58)
    bpm   = features.get("bpm", 120) or 120
    vec[50] = min(bpm / 200.0, 1.0)
    vec[51] = features.get("energy", 0.5) or 0.5
    vec[52] = features.get("valence", 0.5) or 0.5
    vec[53] = features.get("danceability", 0.5) or 0.5
    vec[54] = features.get("acousticness", 0.3) or 0.3
    vec[55] = features.get("instrumentalness", 0.1) or 0.1
    vec[56] = ((features.get("loudness", -8) or -8) + 60) / 60.0
    vec[57] = features.get("speechiness", 0.1) or 0.1

    norm = np.linalg.norm(vec)
    return vec / norm if norm > 1e-9 else vec


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / norm) if norm > 1e-9 else 0.0


async def generate_daily_recommendation(user_id: str, supabase: Client) -> Optional[dict]:
    """
    Pick the best Song of the Day for a user.
    Returns the recommendation dict to upsert into daily_recommendations.
    """
    today = date.today().isoformat()

    # Check if already generated today
    existing = supabase.table("daily_recommendations").select("track_id").eq("user_id", user_id).eq("date", today).execute()
    if existing.data:
        return None  # already done

    # 1. Load user DNA
    dna_row = supabase.table("music_dna").select("*").eq("user_id", user_id).execute()
    if not dna_row.data:
        return None
    dna = dna_row.data[0]
    user_vec = np.array(dna.get("embedding") or [], dtype=float)
    if user_vec.shape[0] != 256:
        return None

    # 2. Get user's rated track IDs (to exclude)
    rated = supabase.table("ratings").select("content_id").eq("user_id", user_id).execute()
    rated_ids = {r["content_id"] for r in (rated.data or [])}

    # 3. Get listening history IDs (to exclude)
    history = supabase.table("listening_history").select("track_id").eq("user_id", user_id).execute()
    heard_ids = {h["track_id"] for h in (history.data or []) if h.get("track_id")}
    seen_ids = rated_ids | heard_ids

    # 4. Get top genres for candidate pool
    top_genres_raw = dna.get("top_genres") or []
    top_genre_names = [g["genre"] for g in top_genres_raw[:3]]

    # 5. Fetch candidate tracks from catalog (unseen, in user's genres)
    candidates_resp = (
        supabase.table("catalog_tracks")
        .select("*, track_audio_features(*)")
        .overlaps("genres", top_genre_names)
        .gte("popularity", 30)
        .limit(200)
        .execute()
    )
    candidates = [c for c in (candidates_resp.data or []) if c["id"] not in seen_ids]

    if not candidates:
        # Fallback: any popular track not seen
        candidates_resp = (
            supabase.table("catalog_tracks")
            .select("*, track_audio_features(*)")
            .gte("popularity", 60)
            .limit(200)
            .execute()
        )
        candidates = [c for c in (candidates_resp.data or []) if c["id"] not in seen_ids]

    if not candidates:
        return None

    # 6. Get taste-match users (compatibility > 70)
    compat_resp = (
        supabase.table("compatibility_scores")
        .select("user_b, taste_score")
        .eq("user_a", user_id)
        .gte("taste_score", 70)
        .limit(20)
        .execute()
    )
    match_user_ids = [r["user_b"] for r in (compat_resp.data or [])]

    # Reverse lookup (user might be user_b in some pairs)
    compat_resp2 = (
        supabase.table("compatibility_scores")
        .select("user_a, taste_score")
        .eq("user_b", user_id)
        .gte("taste_score", 70)
        .limit(20)
        .execute()
    )
    match_user_ids += [r["user_a"] for r in (compat_resp2.data or [])]

    # What did taste-match users love?
    loved_by_matches: set[str] = set()
    if match_user_ids:
        collab_resp = (
            supabase.table("ratings")
            .select("content_id")
            .in_("user_id", match_user_ids)
            .gte("score", 7.5)
            .execute()
        )
        loved_by_matches = {r["content_id"] for r in (collab_resp.data or [])}

    # 7. Score each candidate
    scored = []
    for track in candidates:
        features = track.get("track_audio_features") or {}
        track_vec = _track_to_vector(track, features)

        content_score = max(0.0, _cosine(user_vec, track_vec))
        collab_score  = 1.0 if track["id"] in loved_by_matches else 0.0
        novelty_score = 1.0  # all candidates are novel (excluded seen above)

        # Trending: recent release boost (< 18 months)
        release = track.get("release_date")
        trending_score = 0.0
        if release:
            try:
                rd = date.fromisoformat(str(release)[:10])
                days_old = (date.today() - rd).days
                if days_old < 540:   # 18 months
                    trending_score = max(0.0, 1.0 - days_old / 540)
            except ValueError:
                pass

        final = (
            WEIGHTS["content"]  * content_score +
            WEIGHTS["collab"]   * collab_score  +
            WEIGHTS["novelty"]  * novelty_score +
            WEIGHTS["trending"] * trending_score
        )

        scored.append({
            "track": track,
            "features": features,
            "content_score": round(content_score, 4),
            "collab_score": round(collab_score, 4),
            "novelty_score": round(novelty_score, 4),
            "trending_score": round(trending_score, 4),
            "final_score": round(final, 4),
            "is_collab": track["id"] in loved_by_matches,
        })

    scored.sort(key=lambda x: -x["final_score"])
    best = scored[0]
    track = best["track"]

    # 8. Build reason string
    if best["is_collab"] and match_user_ids:
        reason = f"A tus matches con buen gusto musical les encanta esta canción 🎯"
        reason_type = "taste_match"
    elif best["trending_score"] > 0.5:
        reason = f"Tendencia en {top_genre_names[0] if top_genre_names else 'tu género favorito'} 🔥"
        reason_type = "trending"
    elif best["content_score"] > 0.7:
        reason = f"Encaja perfectamente con tu ADN musical 🧬"
        reason_type = "genre_fit"
    else:
        reason = f"Nueva descubierta seleccionada solo para ti ✨"
        reason_type = "discovery"

    feat = best["features"]
    rec = {
        "user_id": user_id,
        "date": today,
        "track_id": track["id"],
        "track_name": track["name"],
        "artist_name": (track.get("artist_names") or ["Desconocido"])[0],
        "cover_image": track.get("cover_image"),
        "preview_url": track.get("preview_url"),
        "content_score":  best["content_score"],
        "collab_score":   best["collab_score"],
        "novelty_score":  best["novelty_score"],
        "trending_score": best["trending_score"],
        "final_score":    best["final_score"],
        "reason": reason,
        "reason_type": reason_type,
        "bpm":    feat.get("bpm"),
        "energy": feat.get("energy"),
        "valence": feat.get("valence"),
    }

    supabase.table("daily_recommendations").upsert(rec).execute()
    return rec


async def run_daily_batch(supabase: Client) -> dict:
    """Called by the nightly cron — generates SOTD for all active users."""
    users_resp = supabase.table("users").select("id").execute()
    user_ids = [u["id"] for u in (users_resp.data or [])]

    generated, skipped = 0, 0
    for uid in user_ids:
        result = await generate_daily_recommendation(uid, supabase)
        if result:
            generated += 1
        else:
            skipped += 1

    return {"generated": generated, "skipped": skipped, "total": len(user_ids)}
