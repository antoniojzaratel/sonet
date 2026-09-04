/**
 * Cross-source artist enrichment — merges MusicBrainz (canonical ID + tags),
 * Discogs (genres/styles), and Last.fm (popularity + similar artists) into
 * one record. Spotify stays the primary source for search/playback; this
 * fills in the metadata Spotify's API doesn't expose (canonical MBID,
 * detailed genre/style tags, similar-artist graphs).
 */

import { searchArtistMB } from './musicbrainz';
import { getArtistGenresDiscogs } from './discogs';
import { getArtistInfoLastfm, getSimilarArtistsLastfm } from './lastfm';

export interface EnrichedArtist {
  name: string;
  mbid?: string;
  tags: string[];
  genres: string[];
  styles: string[];
  similar_artists: string[];
  listeners?: number;
  sources: string[];
}

/** Fan out to all three metadata sources in parallel and merge into one record. */
export async function enrichArtist(artistName: string): Promise<EnrichedArtist> {
  const [mbResults, discogsGenres, lastfmInfo, lastfmSimilar] = await Promise.allSettled([
    searchArtistMB(artistName, 1),
    getArtistGenresDiscogs(artistName),
    getArtistInfoLastfm(artistName),
    getSimilarArtistsLastfm(artistName, 10),
  ]);

  const mb = mbResults.status === 'fulfilled' ? mbResults.value[0] : undefined;
  const genres = discogsGenres.status === 'fulfilled' ? discogsGenres.value : [];
  const lastfm = lastfmInfo.status === 'fulfilled' ? lastfmInfo.value : null;
  const similar = lastfmSimilar.status === 'fulfilled' ? lastfmSimilar.value : [];

  const tags = new Set<string>();
  (mb?.tags ?? []).forEach((t) => tags.add(t));
  (lastfm?.tags ?? []).forEach((t) => tags.add(t));

  const sources: string[] = [];
  if (mb) sources.push('musicbrainz');
  if (genres.length) sources.push('discogs');
  if (lastfm) sources.push('lastfm');

  return {
    name: artistName,
    mbid: mb?.id,
    tags: [...tags],
    genres,
    styles: genres, // Discogs conflates genre/style tags into one bag at this granularity
    similar_artists: [...new Set([...(lastfm?.similar ?? []), ...similar])],
    listeners: lastfm?.listeners,
    sources,
  };
}
