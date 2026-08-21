import { useState, useEffect } from 'react';
import { cwWeekKey, rotationIndex } from '../utils/date';
import type { CrosswordData, CrosswordIndex } from '../types';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

function isPuzzle(value: unknown): value is CrosswordData {
  const p = value as CrosswordData;
  return !!p && Number.isFinite(p.rows) && Number.isFinite(p.cols) && Array.isArray(p.result) && p.result.length > 0;
}

/**
 * Serves this week's puzzle from the generated library, rotating through it so
 * a new one appears every week without anyone publishing anything. Falls back
 * to the single-puzzle file if the library is unreachable, so the crossword
 * never comes up empty.
 */
export function useCrossword(enabled: boolean) {
  const weekKey = cwWeekKey();
  const [data, setData] = useState<CrosswordData | null>(null);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const index = await fetchJson<CrosswordIndex>('crosswords/index.json');
        const puzzles = index.puzzles ?? [];
        if (!puzzles.length) throw new Error('empty crossword library');

        const chosen = puzzles[rotationIndex(puzzles.length)];
        const puzzle = await fetchJson<CrosswordData>(`crosswords/${chosen.id}.json`);
        if (!isPuzzle(puzzle)) throw new Error(`${chosen.id} is malformed`);
        if (cancelled) return;
        setData(puzzle);
        setPuzzleId(chosen.id);
      } catch {
        try {
          const legacy = await fetchJson<CrosswordData>('crossword.json');
          if (!isPuzzle(legacy)) throw new Error('crossword.json is malformed');
          if (cancelled) return;
          setData(legacy);
          setPuzzleId('crossword');
        } catch {
          if (!cancelled) setError(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  return {
    data,
    error,
    /** Storage key for progress: per week and per puzzle. */
    progressKey: puzzleId ? `physio_crossword_${weekKey}_${puzzleId}` : null,
    weekKey,
  };
}
