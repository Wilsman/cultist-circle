/**
 * Orders fuzzy search results so names that plainly contain the search come
 * first. Fuzzy-only matches are kept only when nothing matches plainly, so a
 * typo still finds something but "ledx" doesn't list a sledgehammer.
 */

export interface ScoredResult<T> {
  item: T;
  /** Fuse score: 0 is a perfect match, 1 is no match. */
  score?: number;
}

/** Lower is better. */
export type MatchTier = 0 | 1 | 2 | 3 | 4;

const WORD_SPLIT = /[\s\-_/().,]+/;

export function getMatchTier(names: string[], term: string): MatchTier {
  const query = term.trim().toLowerCase();
  if (!query) return 4;
  const tokens = query.split(WORD_SPLIT).filter(Boolean);
  let best: MatchTier = 4;
  for (const raw of names) {
    const name = raw.toLowerCase();
    if (name === query) return 0;
    if (name.startsWith(query)) {
      best = Math.min(best, 1) as MatchTier;
      continue;
    }
    const words = name.split(WORD_SPLIT).filter(Boolean);
    if (
      tokens.length > 0 &&
      tokens.every((token) => words.some((word) => word.startsWith(token)))
    ) {
      best = Math.min(best, 2) as MatchTier;
      continue;
    }
    if (name.includes(query)) {
      best = Math.min(best, 3) as MatchTier;
    }
  }
  return best;
}

export function rankSearchResults<T>(
  results: ScoredResult<T>[],
  term: string,
  getNames: (item: T) => string[],
): T[] {
  const ranked = results.map((result, index) => ({
    item: result.item,
    score: result.score ?? 1,
    index,
    tier: getMatchTier(getNames(result.item), term),
  }));
  const hasPlainMatch = ranked.some((entry) => entry.tier < 4);
  return ranked
    .filter((entry) => !hasPlainMatch || entry.tier < 4)
    .sort((a, b) => a.tier - b.tier || a.score - b.score || a.index - b.index)
    .map((entry) => entry.item);
}
