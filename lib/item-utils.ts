/**
 * Item utility functions for seeded randomization.
 * Extracted from app.tsx for reusability and testability.
 */

/**
 * FNV-1a hash function for generating deterministic seeds from strings.
 */
export function hashString(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Simple seeded random number generator (splitmix32-like).
 * Returns a function that produces random numbers in [0, 1).
 */
export function createRng(seed: number): () => number {
    let s = seed;
    return function () {
        s += 0x6d2b79f5;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Shuffle an array deterministically using a seed.
 * Uses Fisher-Yates shuffle with seeded RNG.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
    const result = arr.slice();
    const rnd = createRng(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
