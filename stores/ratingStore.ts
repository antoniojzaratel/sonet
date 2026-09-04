import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { useAuthStore } from '@/stores/authStore';
import { DEMO_USER_ID, DEMO_RATINGS, DEMO_FEED } from '@/lib/demoContent';
import {
  insertByComparison,
  buildRankedList,
  BUCKET_ORDER,
  type Bucket,
  type Comparator,
  type RankableItem,
} from '@/lib/ranking';
import type { ContentType } from '@/types';

export interface RatingEntry extends RankableItem {
  id: string;
  contentId: string;
  contentName: string;
  artistName: string;
  imageUrl: string;
  contentType: ContentType;
  score: number;
  bucket: Bucket;
  rankPosition: number;
  review?: string;
  createdAt: string;
}

export interface FeedEntry {
  rating: RatingEntry;
  user: { id: string; displayName: string; username: string; avatarUrl?: string };
}

interface RatingRow {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;
  content_name: string;
  content_image: string | null;
  artist_name: string;
  score: number;
  bucket: Bucket;
  rank_position: number;
  review: string | null;
  created_at: string;
}

function rowToEntry(row: RatingRow): RatingEntry {
  return {
    id: row.id,
    contentId: row.content_id,
    contentName: row.content_name,
    artistName: row.artist_name,
    imageUrl: row.content_image ?? '',
    contentType: row.content_type,
    score: row.score,
    bucket: row.bucket,
    rankPosition: row.rank_position,
    review: row.review ?? undefined,
    createdAt: row.created_at,
  };
}

interface NewRatingInput {
  userId: string;
  contentType: ContentType;
  contentId: string;
  contentName: string;
  artistName: string;
  imageUrl: string;
  bucket: Bucket;
  review?: string;
  /** Shows the "¿Cuál prefieres?" duel and resolves with the user's pick. */
  compare: Comparator<RatingEntry>;
}

interface RatingStore {
  ratings: RatingEntry[];
  feed: FeedEntry[];
  loading: boolean;
  loadingFeed: boolean;

  loadRatings: (userId: string) => Promise<void>;
  loadFeed: () => Promise<void>;
  addRating: (input: NewRatingInput) => Promise<RatingEntry | null>;
  removeRating: (userId: string, contentId: string, contentType: ContentType) => Promise<void>;
  getRatingForContent: (contentId: string) => RatingEntry | undefined;
  getTopRated: (limit?: number) => RatingEntry[];
  getStats: () => { total: number; avgScore: number; likedCount: number; fineCount: number; dislikedCount: number };
}

export const useRatingStore = create<RatingStore>((set, get) => ({
  ratings: [],
  feed: [],
  loading: false,
  loadingFeed: false,

  loadRatings: async (userId) => {
    if (userId === DEMO_USER_ID) {
      set({ ratings: DEMO_RATINGS, loading: false });
      return;
    }
    set({ loading: true });
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .order('rank_position', { ascending: true });

    set({ ratings: !error && data ? (data as RatingRow[]).map(rowToEntry) : [], loading: false });
  },

  loadFeed: async () => {
    if (useAuthStore.getState().isRichDemo) {
      set({ feed: DEMO_FEED, loadingFeed: false });
      return;
    }
    set({ loadingFeed: true });
    const { data, error } = await supabase
      .from('ratings')
      .select('*, user:users(id, display_name, username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const feed: FeedEntry[] = (data as any[]).map((row) => ({
        rating: rowToEntry(row),
        user: row.user
          ? {
              id: row.user.id,
              displayName: row.user.display_name,
              username: row.user.username,
              avatarUrl: row.user.avatar_url ?? undefined,
            }
          : { id: row.user_id, displayName: 'Usuario', username: 'usuario' },
      }));
      set({ feed });
    }
    set({ loadingFeed: false });
  },

  addRating: async (input) => {
    const { userId, contentType, bucket, compare } = input;

    // Demo account: run the exact same ranking algorithm entirely in
    // memory, no Supabase round-trip — so rating something live during a
    // demo works even with no backend configured, and the new rating
    // shows up in the Feed immediately.
    if (userId === DEMO_USER_ID) {
      const existing = get().ratings.filter((r) => r.contentType === contentType);
      const buckets: Record<Bucket, RatingEntry[]> = {
        liked: existing.filter((r) => r.bucket === 'liked'),
        fine: existing.filter((r) => r.bucket === 'fine'),
        disliked: existing.filter((r) => r.bucket === 'disliked'),
      };
      const newItem: RatingEntry = {
        id: `demo-${Date.now()}`,
        contentId: input.contentId,
        contentName: input.contentName,
        artistName: input.artistName,
        imageUrl: input.imageUrl,
        contentType,
        score: 0,
        bucket,
        rankPosition: 0,
        review: input.review,
        createdAt: new Date().toISOString(),
      };
      const { ordered } = await insertByComparison(buckets[bucket], newItem, compare);
      buckets[bucket] = ordered;
      const ranked = buildRankedList(buckets);
      const rankedEntries = ranked.map((r) => ({ ...r.item, bucket: r.bucket, rankPosition: r.rankPosition, score: r.score }));

      set((state) => ({
        ratings: [...state.ratings.filter((r) => r.contentType !== contentType), ...rankedEntries].sort(
          (a, b) => a.rankPosition - b.rankPosition
        ),
        feed: [
          { rating: rankedEntries.find((r) => r.contentId === input.contentId)!, user: { id: userId, displayName: 'Alex Rivera', username: 'alexdemo' } },
          ...state.feed,
        ],
      }));

      return rankedEntries.find((r) => r.contentId === input.contentId) ?? null;
    }

    // 1. Pull the user's existing strict order for this content type.
    const { data: existingRows, error: fetchError } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('content_type', contentType)
      .order('rank_position', { ascending: true });

    if (fetchError) return null;

    const existing = ((existingRows ?? []) as RatingRow[]).map(rowToEntry);
    const buckets: Record<Bucket, RatingEntry[]> = {
      liked: existing.filter((r) => r.bucket === 'liked'),
      fine: existing.filter((r) => r.bucket === 'fine'),
      disliked: existing.filter((r) => r.bucket === 'disliked'),
    };

    // 2. Binary-insert the new item into its bucket via pairwise duels.
    const newItem: RatingEntry = {
      id: `pending-${Date.now()}`,
      contentId: input.contentId,
      contentName: input.contentName,
      artistName: input.artistName,
      imageUrl: input.imageUrl,
      contentType,
      score: 0,
      bucket,
      rankPosition: 0,
      review: input.review,
      createdAt: new Date().toISOString(),
    };

    const { ordered, duels } = await insertByComparison(buckets[bucket], newItem, compare);
    buckets[bucket] = ordered;

    // 3. Recompute rank_position + score for every item in this content type.
    const ranked = buildRankedList(buckets);

    // 4. Persist: upsert every row (small per-user, per-type lists — cheap to
    // rewrite in full, and avoids partial-order bugs). The rank_position
    // unique constraint is DEFERRABLE so a full renumber in one statement
    // is safe even when positions are being swapped.
    const rows = ranked.map((r) => ({
      user_id: userId,
      content_type: contentType,
      content_id: r.item.contentId,
      content_name: r.item.contentName,
      content_image: r.item.imageUrl || null,
      artist_name: r.item.artistName,
      score: r.score,
      bucket: r.bucket,
      rank_position: r.rankPosition,
      review: r.item.review || null,
      liked: r.bucket === 'liked',
    }));

    const { data: savedRows, error: saveError } = await supabase
      .from('ratings')
      .upsert(rows, { onConflict: 'user_id,content_id,content_type' })
      .select('*');

    if (saveError || !savedRows) return null;

    if (duels.length > 0) {
      await supabase.from('rating_duels').insert(
        duels.map((d) => ({
          user_id: userId,
          content_type: contentType,
          winner_content_id: d.winnerContentId,
          loser_content_id: d.loserContentId,
        }))
      );
    }

    const saved = (savedRows as RatingRow[]).map(rowToEntry);
    set((state) => ({
      ratings: [...state.ratings.filter((r) => r.contentType !== contentType), ...saved].sort(
        (a, b) => a.rankPosition - b.rankPosition
      ),
    }));

    const own = saved.find((r) => r.contentId === input.contentId) ?? null;
    if (own) track('rating_created', { content_type: contentType, bucket });
    return own;
  },

  removeRating: async (userId, contentId, contentType) => {
    await supabase
      .from('ratings')
      .delete()
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType);
    set((state) => ({ ratings: state.ratings.filter((r) => r.contentId !== contentId) }));
  },

  getRatingForContent: (contentId) => get().ratings.find((r) => r.contentId === contentId),

  getTopRated: (limit = 10) => [...get().ratings].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, limit),

  getStats: () => {
    const { ratings } = get();
    return {
      total: ratings.length,
      avgScore: ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0,
      likedCount: ratings.filter((r) => r.bucket === 'liked').length,
      fineCount: ratings.filter((r) => r.bucket === 'fine').length,
      dislikedCount: ratings.filter((r) => r.bucket === 'disliked').length,
    };
  },
}));

export { BUCKET_ORDER };
export type { Bucket };
