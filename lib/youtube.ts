/**
 * YouTube Data API v3 — Music video discovery
 * Used for fetching official music videos linked to tracks
 */

const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';

export interface MusicVideoResult {
  id: string;
  name: string;
  artist_names: string[];
  youtube_url: string;
  thumbnail: string;
  duration_ms: number;
  view_count: number;
  like_count: number;
  published_at: string;
}

export async function searchMusicVideos(
  query: string,
  maxResults = 10,
): Promise<MusicVideoResult[]> {
  if (!YT_API_KEY) return [];

  const params = new URLSearchParams({
    key: YT_API_KEY,
    part: 'snippet',
    q: `${query} official music video`,
    type: 'video',
    videoCategoryId: '10', // Music category
    maxResults: String(maxResults),
    order: 'relevance',
  });

  try {
    const searchRes = await fetch(`${YT_BASE}/search?${params}`);
    const searchData = await searchRes.json();
    const ids: string[] = (searchData.items ?? []).map((i: any) => i.id.videoId);

    if (!ids.length) return [];

    const detailParams = new URLSearchParams({
      key: YT_API_KEY,
      part: 'snippet,statistics,contentDetails',
      id: ids.join(','),
    });

    const detailRes = await fetch(`${YT_BASE}/videos?${detailParams}`);
    const detailData = await detailRes.json();

    return (detailData.items ?? []).map((v: any) => ({
      id: v.id,
      name: v.snippet.title,
      artist_names: [v.snippet.channelTitle],
      youtube_url: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.default?.url ?? '',
      duration_ms: parseDuration(v.contentDetails?.duration ?? 'PT0S'),
      view_count: parseInt(v.statistics?.viewCount ?? '0'),
      like_count: parseInt(v.statistics?.likeCount ?? '0'),
      published_at: v.snippet.publishedAt,
    }));
  } catch {
    return [];
  }
}

export async function getMusicVideoByTrack(
  trackName: string,
  artistName: string,
): Promise<MusicVideoResult | null> {
  const results = await searchMusicVideos(`${artistName} ${trackName}`, 1);
  return results[0] ?? null;
}

function parseDuration(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? '0');
  const m = parseInt(match[2] ?? '0');
  const s = parseInt(match[3] ?? '0');
  return (h * 3600 + m * 60 + s) * 1000;
}
