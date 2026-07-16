import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'sonet', path: 'auth/callback' });

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-modify-public',
  'playlist-modify-private',
  'streaming',
  'user-library-read',
].join(' ');

export const spotifyDiscovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export function useSpotifyAuth() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: SPOTIFY_CLIENT_ID,
      scopes: SCOPES.split(' '),
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    spotifyDiscovery,
  );

  return { request, response, promptAsync };
}

export async function fetchSpotifyProfile(accessToken: string) {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function fetchTopArtists(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20,
) {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.json();
}

export async function fetchTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 20,
) {
  const res = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.json();
}

export async function fetchRecentlyPlayed(accessToken: string, limit = 50) {
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return res.json();
}

export async function searchSpotify(
  accessToken: string,
  query: string,
  type: 'track' | 'album' | 'artist' = 'track',
  limit = 10,
) {
  const params = new URLSearchParams({ q: query, type, limit: String(limit) });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

export function extractGenresFromArtists(artists: any[]): Record<string, number> {
  const genreCount: Record<string, number> = {};
  artists.forEach((artist) => {
    (artist.genres || []).forEach((genre: string) => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
  });
  return genreCount;
}
