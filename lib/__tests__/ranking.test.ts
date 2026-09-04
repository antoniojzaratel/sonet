import { insertByComparison, buildRankedList, scoreForPosition, BUCKET_RANGES, type Bucket } from '../ranking';

interface Item {
  contentId: string;
}

/** A comparator that always prefers whichever item's id sorts first alphabetically. */
function alphaComparator(a: Item, b: Item): Promise<'a' | 'b'> {
  return Promise.resolve(a.contentId < b.contentId ? 'a' : 'b');
}

describe('insertByComparison', () => {
  it('inserts into an empty list at position 0', async () => {
    const { ordered, position, duels } = await insertByComparison<Item>([], { contentId: 'a' }, alphaComparator);
    expect(ordered.map((i) => i.contentId)).toEqual(['a']);
    expect(position).toBe(0);
    expect(duels).toHaveLength(0);
  });

  it('inserts at the front when it beats everything', async () => {
    const existing = [{ contentId: 'b' }, { contentId: 'c' }, { contentId: 'd' }];
    const { ordered, position } = await insertByComparison(existing, { contentId: 'a' }, alphaComparator);
    expect(ordered.map((i) => i.contentId)).toEqual(['a', 'b', 'c', 'd']);
    expect(position).toBe(0);
  });

  it('inserts at the back when it loses to everything', async () => {
    const existing = [{ contentId: 'a' }, { contentId: 'b' }, { contentId: 'c' }];
    const { ordered, position } = await insertByComparison(existing, { contentId: 'd' }, alphaComparator);
    expect(ordered.map((i) => i.contentId)).toEqual(['a', 'b', 'c', 'd']);
    expect(position).toBe(3);
  });

  it('inserts in the middle at the correct slot', async () => {
    const existing = [{ contentId: 'a' }, { contentId: 'c' }, { contentId: 'e' }];
    const { ordered, position } = await insertByComparison(existing, { contentId: 'b' }, alphaComparator);
    expect(ordered.map((i) => i.contentId)).toEqual(['a', 'b', 'c', 'e']);
    expect(position).toBe(1);
  });

  it('uses O(log n) comparisons, not O(n)', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({ contentId: String(i).padStart(4, '0') }));
    const { duels } = await insertByComparison(existing, { contentId: '0050b' }, alphaComparator);
    expect(duels.length).toBeLessThanOrEqual(7); // ceil(log2(101))
  });
});

describe('scoreForPosition', () => {
  it('gives the single item in a bucket the midpoint score', () => {
    const score = scoreForPosition('liked', 0, 1);
    const [min, max] = BUCKET_RANGES.liked;
    expect(score).toBeCloseTo((min + max) / 2, 1);
  });

  it('gives position 0 (best) the top of the band', () => {
    expect(scoreForPosition('liked', 0, 5)).toBeCloseTo(10.0, 1);
  });

  it('gives the last position the bottom of the band', () => {
    expect(scoreForPosition('liked', 4, 5)).toBeCloseTo(7.0, 1);
  });

  it('never produces a score outside its bucket band', () => {
    const buckets: Bucket[] = ['liked', 'fine', 'disliked'];
    for (const bucket of buckets) {
      const [min, max] = BUCKET_RANGES[bucket];
      for (let pos = 0; pos < 10; pos++) {
        const score = scoreForPosition(bucket, pos, 10);
        expect(score).toBeGreaterThanOrEqual(min);
        expect(score).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe('buildRankedList', () => {
  it('never assigns the same rank_position to two items — the whole point of this system', () => {
    const buckets: Record<Bucket, Item[]> = {
      liked: [{ contentId: 'l1' }, { contentId: 'l2' }],
      fine: [{ contentId: 'f1' }],
      disliked: [{ contentId: 'd1' }, { contentId: 'd2' }, { contentId: 'd3' }],
    };
    const ranked = buildRankedList(buckets);
    const positions = ranked.map((r) => r.rankPosition);
    expect(new Set(positions).size).toBe(positions.length);
    expect(positions.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('always ranks liked above fine above disliked, regardless of scores', () => {
    const buckets: Record<Bucket, Item[]> = {
      liked: [{ contentId: 'l1' }],
      fine: [{ contentId: 'f1' }],
      disliked: [{ contentId: 'd1' }],
    };
    const ranked = buildRankedList(buckets);
    const byBucket = Object.fromEntries(ranked.map((r) => [r.bucket, r.rankPosition]));
    expect(byBucket.liked).toBeLessThan(byBucket.fine);
    expect(byBucket.fine).toBeLessThan(byBucket.disliked);
  });
});
