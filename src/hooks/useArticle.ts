import { useState, useEffect } from 'react';
import { vancouverDateStr } from '../utils/date';
import type { Article, ArticleIndex } from '../types';

interface CachedArticle {
  article: Article;
  /** The date the article was actually published under. */
  date: string;
}

function cacheKey(dateStr: string) {
  return `physio_article_${dateStr}`;
}

function readCache(dateStr: string): CachedArticle | null {
  try {
    const cached = localStorage.getItem(cacheKey(dateStr));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Entries written before articles could fall back stored the bare article.
    return parsed?.article ? (parsed as CachedArticle) : { article: parsed as Article, date: dateStr };
  } catch {
    return null;
  }
}

function writeCache(todayStr: string, value: CachedArticle) {
  try {
    localStorage.setItem(cacheKey(todayStr), JSON.stringify(value));
  } catch {
    // storage full or unavailable — the article still renders this session
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Loads today's article, falling back to the most recent earlier one when a day
 * has no article of its own, so a missed publication day still shows something.
 */
export function useArticle() {
  const today = vancouverDateStr();
  const [cached] = useState(() => readCache(today));
  const [article, setArticle] = useState<Article | null>(cached?.article ?? null);
  const [articleDate, setArticleDate] = useState<string | null>(cached?.date ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (article) return;
    let cancelled = false;

    (async () => {
      try {
        const todays = await fetchJson<Article>(`articles/${today}.json`);
        if (cancelled) return;
        writeCache(today, { article: todays, date: today });
        setArticle(todays);
        setArticleDate(today);
      } catch {
        try {
          const index = await fetchJson<ArticleIndex>('articles/index.json');
          const previous = (index.articles ?? [])
            .filter(entry => entry.date < today)
            .sort((a, b) => a.date.localeCompare(b.date))
            .at(-1);
          if (!previous) throw new Error(`No article for ${today}`);
          const fallback = await fetchJson<Article>(`articles/${previous.date}.json`);
          if (cancelled) return;
          writeCache(today, { article: fallback, date: previous.date });
          setArticle(fallback);
          setArticleDate(previous.date);
        } catch {
          if (cancelled) return;
          setError(`No article for ${today}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [article, today]);

  return {
    article,
    articleDate,
    /** True when today has no article of its own and an older one is shown. */
    isArchive: articleDate !== null && articleDate !== today,
    loading,
    error,
    today,
  };
}
