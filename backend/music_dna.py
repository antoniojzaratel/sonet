"""
Music DNA Builder
Constructs a 256-dim taste vector per user from Spotify data + rating history.
"""
import hashlib
import numpy as np
from typing import Optional
from supabase import create_client, Client


GENRE_LIST = [
    "pop", "rock", "hip-hop", "reggaeton", "electronic", "jazz", "metal",
    "r&b", "latin", "indie", "classical", "cumbia", "trap", "banda", "salsa",
    "k-pop", "folk", "punk", "soul", "blues", "reggae", "country", "dance",
    "house", "techno", "ambient", "alternative", "grunge", "disco", "funk",
    "gospel", "bossa nova", "flamenco", "tango", "opera", "new wave",
    "post-rock", "emo", "hardcore", "dubstep", "drum and bass", "lo-fi",
    "synthwave", "vaporwave", "afrobeats", "bachata", "merengue", "norteño",
    "grupero", "ranchera",
]
GENRE_INDEX = {g: i for i, g in enumerate(GENRE_LIST)}
N_GENRES = len(GENRE_LIST)     # 50
N_AUDIO  = 9                   # avg of 9 Spotify audio features
N_BEHAV  = 5                   # behavioral signals
N_LANG   = 8                   # language slots
N_ERA    = 8                   # decade slots
N_ARTIST = 128                 # artist embedding (avg of random projections)
EMBED_DIM = N_GENRES + N_AUDIO + N_BEHAV + N_LANG + N_ERA + N_ARTIST  # = 208 → pad to 256


DECADE_INDEX = {
    "1950s": 0, "1960s": 1, "1970s": 2, "1980s": 3,
    "1960s": 1, "1990s": 4, "2000s": 5, "2010s": 6, "2020s": 7,
}
LANG_INDEX = {"es": 0, "en": 1, "pt": 2, "fr": 3, "de": 4, "ko": 5, "ja": 6, "other": 7}


def _genre_vector(top_genres: list[dict]) -> np.ndarray:
    vec = np.zeros(N_GENRES)
    for item in top_genres:
        g = item.get("genre", "").lower()
        w = float(item.get("weight", 0))
        if g in GENRE_INDEX:
            vec[GENRE_INDEX[g]] = w
        else:
            for known in GENRE_INDEX:
                if known in g or g in known:
                    vec[GENRE_INDEX[known]] = max(vec[GENRE_INDEX[known]], w)
                    break
    total = vec.sum()
    return vec / total if total > 0 else vec


def _audio_vector(dna: dict) -> np.ndarray:
    return np.array([
        dna.get("avg_bpm", 120) / 200.0,
        dna.get("avg_energy", 0.5),
        dna.get("avg_valence", 0.5),
        dna.get("avg_danceability", 0.5),
        dna.get("avg_acousticness", 0.5),
        dna.get("avg_instrumentalness", 0.1),
        (dna.get("avg_loudness", -8) + 60) / 60.0,
        dna.get("avg_speechiness", 0.1),
        dna.get("avg_liveness", 0.2),
    ], dtype=float)


def _behavioral_vector(dna: dict) -> np.ndarray:
    return np.array([
        (dna.get("listening_peak_hour", 20)) / 23.0,
        min(dna.get("avg_track_duration_s", 210) / 600.0, 1.0),
        dna.get("skip_rate", 0.2),
        dna.get("repeat_rate", 0.3),
        dna.get("discovery_rate", 0.4),
    ], dtype=float)


def _language_vector(top_languages: list[dict]) -> np.ndarray:
    vec = np.zeros(N_LANG)
    for item in top_languages:
        lang = item.get("lang", "other").lower()
        w = float(item.get("weight", 0))
        idx = LANG_INDEX.get(lang, LANG_INDEX["other"])
        vec[idx] += w
    total = vec.sum()
    return vec / total if total > 0 else vec


def _era_vector(top_eras: list[dict]) -> np.ndarray:
    vec = np.zeros(N_ERA)
    for item in top_eras:
        decade = item.get("decade", "2010s")
        w = float(item.get("weight", 0))
        idx = DECADE_INDEX.get(decade, 6)
        vec[idx] += w
    total = vec.sum()
    return vec / total if total > 0 else vec


def _artist_embedding(top_artists: list[dict]) -> np.ndarray:
    """
    Stable random projection of artist IDs into 128-dim space.
    In production replace with a real artist2vec model.
    """
    vec = np.zeros(N_ARTIST)
    for item in top_artists:
        artist_id = item.get("id", "") or item.get("name", "")
        if not artist_id:
            continue
        weight = float(item.get("play_count", 1))
        # Python's built-in hash() is randomized per-process (PYTHONHASHSEED) —
        # using it here would make the "stable" embedding drift on every
        # backend restart/deploy. md5 is deterministic across processes.
        stable_hash = int(hashlib.md5(artist_id.encode("utf-8")).hexdigest(), 16)
        rng = np.random.default_rng(stable_hash % (2**32))
        proj = rng.standard_normal(N_ARTIST)
        proj /= np.linalg.norm(proj) + 1e-9
        vec += proj * weight
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def build_embedding(dna_row: dict) -> np.ndarray:
    """Assemble the full 256-dim embedding from a music_dna DB row."""
    parts = [
        _genre_vector(dna_row.get("top_genres") or []),
        _audio_vector(dna_row),
        _behavioral_vector(dna_row),
        _language_vector(dna_row.get("top_languages") or []),
        _era_vector(dna_row.get("top_eras") or []),
        _artist_embedding(dna_row.get("top_artists") or []),
    ]
    vec = np.concatenate(parts)                 # 208 dims
    padded = np.zeros(256)
    padded[:len(vec)] = vec
    norm = np.linalg.norm(padded)
    return padded / norm if norm > 0 else padded


async def compute_and_store_dna(user_id: str, spotify_token: str, supabase: Client) -> dict:
    """
    Fetch Spotify data for a user, build their MusicDNA, and upsert into DB.
    Returns the DNA dict that was stored.
    """
    import httpx

    headers = {"Authorization": f"Bearer {spotify_token}"}
    async with httpx.AsyncClient() as client:
        # Fetch top artists (medium term = ~6 months)
        r_artists = await client.get(
            "https://api.spotify.com/v1/me/top/artists",
            params={"limit": 50, "time_range": "medium_term"},
            headers=headers,
        )
        artists = r_artists.json().get("items", []) if r_artists.status_code == 200 else []

        # Fetch top tracks
        r_tracks = await client.get(
            "https://api.spotify.com/v1/me/top/tracks",
            params={"limit": 50, "time_range": "medium_term"},
            headers=headers,
        )
        tracks = r_tracks.json().get("items", []) if r_tracks.status_code == 200 else []

        # Fetch audio features for top tracks
        track_ids = [t["id"] for t in tracks if t.get("id")]
        audio_features = []
        if track_ids:
            r_af = await client.get(
                "https://api.spotify.com/v1/audio-features",
                params={"ids": ",".join(track_ids[:50])},
                headers=headers,
            )
            if r_af.status_code == 200:
                audio_features = [f for f in r_af.json().get("audio_features", []) if f]

    # --- Build genre breakdown ---
    genre_count: dict[str, float] = {}
    for artist in artists:
        for genre in artist.get("genres", []):
            genre_count[genre] = genre_count.get(genre, 0) + 1
    total_g = sum(genre_count.values()) or 1
    top_genres = sorted(
        [{"genre": g, "weight": round(c / total_g, 4)} for g, c in genre_count.items()],
        key=lambda x: -x["weight"],
    )[:10]

    # --- Audio feature averages ---
    def avg(key, default=0.0):
        vals = [f[key] for f in audio_features if f.get(key) is not None]
        return round(float(np.mean(vals)), 4) if vals else default

    avg_bpm           = avg("tempo", 120)
    avg_energy        = avg("energy", 0.5)
    avg_valence       = avg("valence", 0.5)
    avg_danceability  = avg("danceability", 0.5)
    avg_acousticness  = avg("acousticness", 0.3)
    avg_instrumentalness = avg("instrumentalness", 0.1)
    avg_loudness      = avg("loudness", -8)
    avg_speechiness   = avg("speechiness", 0.1)

    # --- Language detection (from artist country heuristic) ---
    lang_map: dict[str, float] = {}
    for artist in artists:
        # Heuristic: map genre keywords to language
        genres_str = " ".join(artist.get("genres", []))
        if any(k in genres_str for k in ["latin", "reggaeton", "cumbia", "salsa", "banda"]):
            lang_map["es"] = lang_map.get("es", 0) + 1
        elif any(k in genres_str for k in ["k-pop", "korean"]):
            lang_map["ko"] = lang_map.get("ko", 0) + 1
        elif any(k in genres_str for k in ["j-pop", "anime", "japanese"]):
            lang_map["ja"] = lang_map.get("ja", 0) + 1
        elif any(k in genres_str for k in ["french", "chanson"]):
            lang_map["fr"] = lang_map.get("fr", 0) + 1
        else:
            lang_map["en"] = lang_map.get("en", 0) + 1
    total_l = sum(lang_map.values()) or 1
    top_languages = [{"lang": l, "weight": round(c / total_l, 4)} for l, c in lang_map.items()]

    # --- Era breakdown (from release years) ---
    era_count: dict[str, float] = {}
    for track in tracks:
        year_str = track.get("album", {}).get("release_date", "2020")[:4]
        try:
            year = int(year_str)
            decade = f"{(year // 10) * 10}s"
            era_count[decade] = era_count.get(decade, 0) + 1
        except ValueError:
            pass
    total_e = sum(era_count.values()) or 1
    top_eras = [{"decade": d, "weight": round(c / total_e, 4)} for d, c in era_count.items()]

    # --- Top artists for embedding ---
    top_artists_data = [
        {"id": a["id"], "name": a["name"], "play_count": a.get("popularity", 50)}
        for a in artists[:20]
    ]

    # --- Top tracks ---
    top_tracks_ids = [t["id"] for t in tracks[:50]]

    # --- Assemble DNA dict ---
    dna = {
        "user_id": user_id,
        "top_genres": top_genres,
        "avg_bpm": avg_bpm,
        "avg_energy": avg_energy,
        "avg_valence": avg_valence,
        "avg_danceability": avg_danceability,
        "avg_acousticness": avg_acousticness,
        "avg_instrumentalness": avg_instrumentalness,
        "avg_loudness": avg_loudness,
        "avg_speechiness": avg_speechiness,
        "top_languages": top_languages,
        "top_eras": top_eras,
        "top_artists": top_artists_data,
        "top_tracks": top_tracks_ids,
        "total_tracks_analyzed": len(tracks),
        "listening_peak_hour": 20,   # default; refine from listening history
        "avg_track_duration_s": avg("duration_ms", 210000) / 1000,
        "skip_rate": 0.2,
        "repeat_rate": 0.3,
        "discovery_rate": 0.4,
    }

    # Build embedding vector
    embedding = build_embedding(dna).tolist()
    dna["embedding"] = embedding

    # Upsert into Supabase
    supabase.table("music_dna").upsert(dna).execute()

    return dna
