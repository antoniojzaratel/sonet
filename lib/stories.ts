// Stories musicales — 24h ephemeral posts (image + optional linked song).
// Media lives in Supabase Storage (bucket 'stories', created by the owner —
// see README manual); these rows just point at it. See supabase/schema.sql
// for the `stories`/`story_views` tables this reads/writes.

import { supabase } from './supabase';

export interface StoryRow {
  id: string;
  user_id: string;
  image_url: string;
  audio_url: string | null;
  caption: string | null;
  track_id: string | null;
  track_name: string | null;
  artist_name: string | null;
  created_at: string;
  expires_at: string;
}

export interface UserStories {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  /** Oldest first — chronological playback order. */
  stories: StoryRow[];
  hasUnseen: boolean;
}

/**
 * Uploads a local image URI (from expo-image-picker) to the 'stories'
 * bucket and returns its public URL. Works for any local file:// URI
 * because `fetch` on a local URI in RN/Expo returns a real Blob/ArrayBuffer.
 */
export async function uploadStoryImage(localUri: string, userId: string): Promise<string> {
  const extMatch = localUri.split('?')[0].match(/\.(\w+)$/);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from('stories').upload(path, arrayBuffer, {
    contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('stories').getPublicUrl(path);
  return data.publicUrl;
}

export interface CreateStoryParams {
  userId: string;
  imageUrl: string;
  caption?: string;
  track?: { id: string; name: string; artist: string; previewUrl?: string | null };
}

export async function createStory(params: CreateStoryParams): Promise<void> {
  const { error } = await supabase.from('stories').insert({
    user_id: params.userId,
    image_url: params.imageUrl,
    audio_url: params.track?.previewUrl ?? null,
    caption: params.caption || null,
    track_id: params.track?.id ?? null,
    track_name: params.track?.name ?? null,
    artist_name: params.track?.artist ?? null,
  });
  if (error) throw error;
}

/**
 * Every currently-active story (expires_at in the future), grouped by
 * author. The signed-in viewer's own group (if any) sorts first, then
 * groups with something unseen, most-recently-active first.
 */
export async function fetchActiveStoryGroups(viewerId?: string): Promise<UserStories[]> {
  const nowIso = new Date().toISOString();
  const { data: rows } = await supabase
    .from('stories')
    .select('*, user:users(display_name, avatar_url)')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: true });

  if (!rows || rows.length === 0) return [];

  const { data: viewedRows } = viewerId
    ? await supabase.from('story_views').select('story_id').eq('viewer_id', viewerId)
    : { data: [] as { story_id: string }[] };
  const viewedSet = new Set((viewedRows ?? []).map((v) => v.story_id));

  const byUser = new Map<string, UserStories>();
  for (const row of rows as any[]) {
    if (!byUser.has(row.user_id)) {
      byUser.set(row.user_id, {
        user_id: row.user_id,
        display_name: row.user?.display_name ?? 'Usuario',
        avatar_url: row.user?.avatar_url ?? undefined,
        stories: [],
        hasUnseen: false,
      });
    }
    const group = byUser.get(row.user_id)!;
    const { user, ...story } = row;
    group.stories.push(story as StoryRow);
    if (!viewedSet.has(row.id)) group.hasUnseen = true;
  }

  const groups = Array.from(byUser.values());
  groups.sort((a, b) => {
    if (a.user_id === viewerId) return -1;
    if (b.user_id === viewerId) return 1;
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLast = a.stories[a.stories.length - 1].created_at;
    const bLast = b.stories[b.stories.length - 1].created_at;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });

  return groups;
}

/** Ignores a duplicate-view (already-seen) conflict — that's not an error here. */
export async function markStoryViewed(storyId: string, viewerId: string): Promise<void> {
  const { error } = await supabase.from('story_views').insert({ story_id: storyId, viewer_id: viewerId });
  if (error && error.code !== '23505') throw error;
}
