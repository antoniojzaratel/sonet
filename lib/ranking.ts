// Beli/Letterboxd-style forced ranking: every rating is inserted into a
// strictly ordered list via pairwise "this or that" comparisons, so no two
// items in the same bucket can ever tie. Pure and UI-agnostic — the caller
// supplies the comparator (which shows the duel UI and awaits a tap) and
// persists the result.

export type Bucket = 'liked' | 'fine' | 'disliked';

export const BUCKET_ORDER: Bucket[] = ['liked', 'fine', 'disliked'];

export const BUCKET_RANGES: Record<Bucket, [number, number]> = {
  liked: [7.0, 10.0],
  fine: [4.0, 6.9],
  disliked: [1.0, 3.9],
};

export const BUCKET_LABELS: Record<Bucket, string> = {
  liked: 'Me gustó',
  fine: 'Estuvo bien',
  disliked: 'No fue lo mío',
};

export interface RankableItem {
  contentId: string;
}

export interface Duel {
  winnerContentId: string;
  loserContentId: string;
}

/** Returns 'a' if `a` is preferred over `b`, 'b' otherwise. Typically backed by a UI duel. */
export type Comparator<T extends RankableItem> = (a: T, b: T) => Promise<'a' | 'b'>;

/**
 * Binary-search-insert `newItem` into `existing` (already ordered best→worst).
 * Uses O(log n) comparisons. Returns the new ordered array, the 0-indexed
 * insertion position, and the duel log.
 */
export async function insertByComparison<T extends RankableItem>(
  existing: T[],
  newItem: T,
  compare: Comparator<T>
): Promise<{ ordered: T[]; position: number; duels: Duel[] }> {
  const duels: Duel[] = [];
  let lo = 0;
  let hi = existing.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = existing[mid];
    const winner = await compare(newItem, candidate);

    duels.push(
      winner === 'a'
        ? { winnerContentId: newItem.contentId, loserContentId: candidate.contentId }
        : { winnerContentId: candidate.contentId, loserContentId: newItem.contentId }
    );

    if (winner === 'a') {
      hi = mid; // newItem beat candidate -> ranks better (earlier) than candidate
    } else {
      lo = mid + 1;
    }
  }

  const ordered = [...existing.slice(0, lo), newItem, ...existing.slice(lo)];
  return { ordered, position: lo, duels };
}

/** Maps a 0-indexed position within a bucket to a 1.0–10.0 score. */
export function scoreForPosition(bucket: Bucket, position0: number, bucketSize: number): number {
  const [min, max] = BUCKET_RANGES[bucket];
  if (bucketSize <= 1) return Math.round(((min + max) / 2) * 10) / 10;
  const frac = position0 / (bucketSize - 1); // 0 = best item in bucket, 1 = worst
  return Math.round((max - frac * (max - min)) * 10) / 10;
}

export interface RankedResult<T extends RankableItem> extends RankableItem {
  item: T;
  bucket: Bucket;
  rankPosition: number; // 1-indexed, global across all buckets for this content_type
  score: number;
}

/**
 * Given the three bucket arrays (each already ordered best→worst, one of
 * them containing the freshly-inserted item), assigns a global rank_position
 * (1 = best overall) and a score to every item. Liked always outranks fine,
 * which always outranks disliked.
 */
export function buildRankedList<T extends RankableItem>(
  buckets: Record<Bucket, T[]>
): RankedResult<T>[] {
  const result: RankedResult<T>[] = [];
  let position = 1;

  for (const bucket of BUCKET_ORDER) {
    const items = buckets[bucket];
    items.forEach((item, index) => {
      result.push({
        contentId: item.contentId,
        item,
        bucket,
        rankPosition: position++,
        score: scoreForPosition(bucket, index, items.length),
      });
    });
  }

  return result;
}
