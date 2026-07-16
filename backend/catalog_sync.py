"""
Music Catalog Sync
Pulls tracks, albums, podcasts, concerts, and music videos from external APIs
into the Supabase catalog tables.
"""
import os
import httpx
from datetime import date, timedelta
from supabase import Client


SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
TICKETMASTER_BASE = "https://app.ticketmaster.com/discovery/v2"

GENRES_TO_SYNC = [
    "pop", "rock", "hip-hop", "reggaeton", "latin", "electronic",
    "r&b", "indie", "metal", "jazz", "k-pop", "soul",
]


async def get_spotify_app_token(client_id: str, client_secret: str) -> str:
    """Get a Spotify App (client credentials) token for catalog access."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            SPOTIFY_TOKEN_URL,
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
        )
        return r.json().get("access_token", "")


async def sync_tracks_by_genre(token: str, genre: str, supabase: Client, limit: int = 50):
    """Search Spotify for popular tracks in a genre and upsert into catalog_tracks."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.spotify.com/v1/search",
            params={"q": f"genre:{genre}", "type": "track", "limit": limit, "market": "US"},
            headers={"Authorization": f"Bearer {token}"},
        )
        items = r.json().get("tracks", {}).get("items", [])

    tracks_to_insert = []
    track_ids = []
    for item in items:
        if not item:
            continue
        tracks_to_insert.append({
            "id": item["id"],
            "isrc": item.get("external_ids", {}).get("isrc"),
            "name": item["name"],
            "artist_names": [a["name"] for a in item.get("artists", [])],
            "artist_ids": [a["id"] for a in item.get("artists", [])],
            "album_id": item.get("album", {}).get("id"),
            "album_name": item.get("album", {}).get("name"),
            "duration_ms": item.get("duration_ms"),
            "explicit": item.get("explicit", False),
            "preview_url": item.get("preview_url"),
            "spotify_url": item.get("external_urls", {}).get("spotify"),
            "cover_image": (item.get("album", {}).get("images") or [{}])[0].get("url"),
            "release_date": item.get("album", {}).get("release_date"),
            "popularity": item.get("popularity", 0),
            "genres": [genre],
        })
        track_ids.append(item["id"])

    if tracks_to_insert:
        supabase.table("catalog_tracks").upsert(tracks_to_insert).execute()

    # Fetch and store audio features
    if track_ids:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.spotify.com/v1/audio-features",
                params={"ids": ",".join(track_ids[:50])},
                headers={"Authorization": f"Bearer {token}"},
            )
            features = r.json().get("audio_features", []) or []

        af_rows = []
        for f in features:
            if not f:
                continue
            af_rows.append({
                "track_id": f["id"],
                "bpm": f.get("tempo"),
                "energy": f.get("energy"),
                "valence": f.get("valence"),
                "danceability": f.get("danceability"),
                "acousticness": f.get("acousticness"),
                "instrumentalness": f.get("instrumentalness"),
                "liveness": f.get("liveness"),
                "loudness": f.get("loudness"),
                "speechiness": f.get("speechiness"),
                "musical_key": f.get("key"),
                "mode": f.get("mode"),
                "time_signature": f.get("time_signature"),
            })

        if af_rows:
            supabase.table("track_audio_features").upsert(af_rows).execute()

    return len(tracks_to_insert)


async def sync_albums_by_genre(token: str, genre: str, supabase: Client, limit: int = 20):
    """Search Spotify for albums in a genre."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.spotify.com/v1/search",
            params={"q": f"genre:{genre}", "type": "album", "limit": limit, "market": "US"},
            headers={"Authorization": f"Bearer {token}"},
        )
        items = r.json().get("albums", {}).get("items", [])

    rows = []
    for item in items:
        if not item:
            continue
        rows.append({
            "id": item["id"],
            "name": item["name"],
            "artist_names": [a["name"] for a in item.get("artists", [])],
            "artist_ids": [a["id"] for a in item.get("artists", [])],
            "album_type": item.get("album_type"),
            "total_tracks": item.get("total_tracks"),
            "cover_image": (item.get("images") or [{}])[0].get("url"),
            "release_date": item.get("release_date"),
            "spotify_url": item.get("external_urls", {}).get("spotify"),
            "genres": [genre],
            "popularity": 50,
        })

    if rows:
        supabase.table("catalog_albums").upsert(rows).execute()
    return len(rows)


async def sync_podcasts(token: str, supabase: Client, limit: int = 20):
    """Search Spotify for popular music podcasts."""
    queries = ["music history", "music analysis", "new music", "album review", "hip-hop podcast"]
    all_rows = []
    async with httpx.AsyncClient() as client:
        for q in queries:
            r = await client.get(
                "https://api.spotify.com/v1/search",
                params={"q": q, "type": "show", "limit": limit, "market": "US"},
                headers={"Authorization": f"Bearer {token}"},
            )
            items = r.json().get("shows", {}).get("items", [])
            for item in (items or []):
                if not item:
                    continue
                all_rows.append({
                    "id": item["id"],
                    "name": item["name"],
                    "description": item.get("description", "")[:500],
                    "publisher": item.get("publisher"),
                    "cover_image": (item.get("images") or [{}])[0].get("url"),
                    "total_episodes": item.get("total_episodes", 0),
                    "languages": item.get("languages", ["en"]),
                    "spotify_url": item.get("external_urls", {}).get("spotify"),
                    "explicit": item.get("explicit", False),
                    "genres": ["podcast"],
                })

    if all_rows:
        unique = {r["id"]: r for r in all_rows}.values()
        supabase.table("catalog_podcasts").upsert(list(unique)).execute()
    return len(all_rows)


async def sync_concerts(api_key: str, supabase: Client, city: str = "Mexico City", radius_km: int = 100):
    """Pull upcoming concerts from Ticketmaster API."""
    start = date.today().isoformat() + "T00:00:00Z"
    end = (date.today() + timedelta(days=180)).isoformat() + "T00:00:00Z"

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{TICKETMASTER_BASE}/events.json",
            params={
                "apikey": api_key,
                "classificationName": "music",
                "city": city,
                "radius": radius_km,
                "unit": "km",
                "startDateTime": start,
                "endDateTime": end,
                "size": 100,
                "sort": "date,asc",
            },
        )
        data = r.json()

    events_raw = data.get("_embedded", {}).get("events", [])
    rows = []
    for ev in events_raw:
        venue = (ev.get("_embedded", {}).get("venues") or [{}])[0]
        loc = venue.get("location", {})
        price = ev.get("priceRanges", [{}])[0] if ev.get("priceRanges") else {}
        images = ev.get("images", [])
        best_img = next((i["url"] for i in images if i.get("width", 0) > 500), None)

        rows.append({
            "id": ev["id"],
            "name": ev["name"],
            "artist_names": [a.get("name") for a in ev.get("_embedded", {}).get("attractions", [])],
            "venue_name": venue.get("name"),
            "venue_address": venue.get("address", {}).get("line1"),
            "city": venue.get("city", {}).get("name"),
            "country": venue.get("country", {}).get("countryCode"),
            "latitude": float(loc.get("latitude", 0) or 0),
            "longitude": float(loc.get("longitude", 0) or 0),
            "date": ev.get("dates", {}).get("start", {}).get("dateTime"),
            "ticket_url": ev.get("url"),
            "cover_image": best_img,
            "price_min": price.get("min"),
            "price_max": price.get("max"),
            "currency": price.get("currency", "USD"),
            "genres": [
                c.get("segment", {}).get("name", "Music")
                for c in ev.get("classifications", [])
            ],
            "is_sold_out": ev.get("dates", {}).get("status", {}).get("code") == "offsale",
            "source": "ticketmaster",
        })

    if rows:
        supabase.table("catalog_concerts").upsert(rows).execute()
    return len(rows)


async def sync_music_videos(youtube_api_key: str, supabase: Client):
    """Pull top music videos from YouTube Data API."""
    queries = [
        "official music video 2024",
        "música regional mexicana video oficial",
        "reggaeton video oficial 2024",
        "hip hop music video 2024",
    ]
    rows = []
    async with httpx.AsyncClient() as client:
        for q in queries:
            r = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": q,
                    "type": "video",
                    "videoCategoryId": "10",  # Music category
                    "maxResults": 25,
                    "key": youtube_api_key,
                    "order": "viewCount",
                },
            )
            items = r.json().get("items", [])
            for item in items:
                vid_id = item.get("id", {}).get("videoId")
                if not vid_id:
                    continue
                snippet = item.get("snippet", {})
                rows.append({
                    "id": vid_id,
                    "name": snippet.get("title", ""),
                    "artist_names": [snippet.get("channelTitle", "")],
                    "youtube_url": f"https://www.youtube.com/watch?v={vid_id}",
                    "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                    "genres": ["music_video"],
                })

    if rows:
        unique = {r["id"]: r for r in rows}.values()
        supabase.table("catalog_music_videos").upsert(list(unique)).execute()
    return len(rows)


async def run_full_sync(
    spotify_client_id: str,
    spotify_client_secret: str,
    ticketmaster_api_key: str,
    youtube_api_key: str,
    supabase: Client,
) -> dict:
    """Run all catalog sync jobs. Called nightly."""
    token = await get_spotify_app_token(spotify_client_id, spotify_client_secret)
    results = {"tracks": 0, "albums": 0, "podcasts": 0, "concerts": 0, "videos": 0}

    for genre in GENRES_TO_SYNC:
        results["tracks"] += await sync_tracks_by_genre(token, genre, supabase)
        results["albums"] += await sync_albums_by_genre(token, genre, supabase)

    results["podcasts"] = await sync_podcasts(token, supabase)

    if ticketmaster_api_key:
        for city in ["Mexico City", "Monterrey", "Guadalajara", "Los Angeles", "New York", "Miami"]:
            results["concerts"] += await sync_concerts(ticketmaster_api_key, supabase, city)

    if youtube_api_key:
        results["videos"] = await sync_music_videos(youtube_api_key, supabase)

    return results
