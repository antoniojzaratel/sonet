import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export interface GenreCategoryItem { label: string; value: number; color: string; }


const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'user-library-read',
].join(' ');
const TOKEN_KEY = 'spotify_access_token';
const REFRESH_KEY = 'spotify_refresh_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string }[];
  popularity: number;
}

export interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  popularity: number;
  preview_url?: string | null;
}

// ─── Redirect URI ─────────────────────────────────────────────────────────────

export function getRedirectUri() {
  return AuthSession.makeRedirectUri({ scheme: 'sonet', path: 'auth/callback' });
}

// ─── Auth Hook ────────────────────────────────────────────────────────────────

export function useSpotifyAuth() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES.split(' '),
      redirectUri: getRedirectUri(),
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    { authorizationEndpoint: 'https://accounts.spotify.com/authorize' },
  );

  async function exchangeCode(code: string, codeVerifier: string) {
    return exchangeCodeForToken(code, codeVerifier);
  }

  return { request, response, promptAsync, exchangeCode };
}

// ─── Token Management ─────────────────────────────────────────────────────────

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> {
  const expiresAt = Date.now() + expiresIn * 1000;
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
    [TOKEN_EXPIRY_KEY, String(expiresAt)],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, TOKEN_EXPIRY_KEY]);
}

export async function getStoredToken(): Promise<string | null> {
  try {
    const [[, token], [, expiryStr]] = await AsyncStorage.multiGet([
      TOKEN_KEY,
      TOKEN_EXPIRY_KEY,
    ]);
    if (!token) return null;

    const expiry = expiryStr ? Number(expiryStr) : 0;
    if (Date.now() < expiry - 60_000) {
      // Still valid (60s buffer)
      return token;
    }

    // Expired — try refresh
    const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      await clearTokens();
      return null;
    }
    return refreshAccessToken(refreshToken);
  } catch {
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = await res.json();
    const newRefresh = data.refresh_token ?? refreshToken;
    await saveTokens(data.access_token, newRefresh, data.expires_in);
    return data.access_token as string;
  } catch {
    return null;
  }
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) return null;

    const data = await res.json();
    await saveTokens(data.access_token, data.refresh_token, data.expires_in);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch {
    return null;
  }
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function spotifyFetch(url: string, token: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      await clearTokens();
      return null;
    }
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function fetchSpotifyProfile(
  token: string,
): Promise<{ id: string; display_name: string; email: string; images: { url: string }[] } | null> {
  return spotifyFetch('https://api.spotify.com/v1/me', token);
}

export async function fetchTopArtists(
  token: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20,
): Promise<{ items: Artist[] } | null> {
  return spotifyFetch(
    `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    token,
  );
}

export async function fetchTopTracks(
  token: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20,
): Promise<{ items: Track[] } | null> {
  return spotifyFetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    token,
  );
}

export async function fetchRecentlyPlayed(
  token: string,
  limit = 20,
): Promise<{ items: { track: Track; played_at: string }[] } | null> {
  return spotifyFetch(
    `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
    token,
  );
}

export async function searchSpotify(
  token: string,
  query: string,
  types: string[] = ['track', 'album'],
  limit = 10,
): Promise<any | null> {
  const params = new URLSearchParams({
    q: query,
    type: types.join(','),
    limit: String(limit),
    market: 'MX',
  });
  return spotifyFetch(`https://api.spotify.com/v1/search?${params}`, token);
}

export async function getRecommendations(
  token: string,
  seedTrackIds: string[],
  limit = 10,
): Promise<{ tracks: Track[] } | null> {
  const seeds = seedTrackIds.slice(0, 5).join(',');
  return spotifyFetch(
    `https://api.spotify.com/v1/recommendations?seed_tracks=${seeds}&limit=${limit}&market=MX`,
    token,
  );
}

// ─── Genre Utilities ──────────────────────────────────────────────────────────

export function extractGenresFromArtists(artists: Artist[]): Record<string, number> {
  const genreCount: Record<string, number> = {};
  for (const artist of artists) {
    for (const genre of artist.genres ?? []) {
      genreCount[genre] = (genreCount[genre] ?? 0) + 1;
    }
  }
  // Sort by count descending
  return Object.fromEntries(Object.entries(genreCount).sort(([, a], [, b]) => b - a));
}

interface GenreCategory {
  label: string;
  value: number;
  color: string;
}

export function mapGenresToCategories(genreMap: Record<string, number>): GenreCategory[] {
  const categories: Record<string, { keywords: string[]; color: string; total: number }> = {
    Corridos: {
      keywords: ['corrido', 'banda', 'norteno', 'regional', 'grupero', 'sierreño'],
      color: '#A855F7',
      total: 0,
    },
    Rock: {
      keywords: ['rock', 'metal', 'punk', 'grunge', 'indie', 'alternative'],
      color: '#F43F5E',
      total: 0,
    },
    'Hip-Hop/Rap': {
      keywords: ['hip hop', 'rap', 'trap', 'drill'],
      color: '#84CC16',
      total: 0,
    },
    Pop: {
      keywords: ['pop', 'dance', 'electro', 'house', 'edm'],
      color: '#F59E0B',
      total: 0,
    },
    Otros: { keywords: [], color: '#666666', total: 0 },
  };

  for (const [genre, count] of Object.entries(genreMap)) {
    const lower = genre.toLowerCase();
    let matched = false;
    for (const [label, cat] of Object.entries(categories)) {
      if (label === 'Otros') continue;
      if (cat.keywords.some((kw) => lower.includes(kw))) {
        cat.total += count;
        matched = true;
        break;
      }
    }
    if (!matched) categories['Otros'].total += count;
  }

  const grandTotal = Object.values(categories).reduce((s, c) => s + c.total, 0) || 1;

  return Object.entries(categories)
    .map(([label, cat]) => ({
      label,
      value: Math.round((cat.total / grandTotal) * 100),
      color: cat.color,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}
