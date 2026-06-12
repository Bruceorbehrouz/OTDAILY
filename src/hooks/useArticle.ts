import { useState, useEffect } from 'react';
import { vancouverDateStr } from '../utils/date';
import type { Article } from '../types';

function cacheKey(dateStr: string) {
  return `physio_article_${dateStr}`;
}

function readCachedArticle(dateStr: string): Article | null {
  try {
    const cached = localStorage.getItem(cacheKey(dateStr));
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function useArticle() {
  const today = vancouverDateStr();
  const [article, setArticle] = useState<Article | null>(() => readCachedArticle(today));
  const [loading, setLoading] = useState(() => !readCachedArticle(today));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (article) return;

    fetch(`${import.meta.env.BASE_URL}articles/${today}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`No article for ${today}`);
        return r.json();
      })
      .then((data: Article) => {
        localStorage.setItem(cacheKey(today), JSON.stringify(data));
        setArticle(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [article, today]);

  return { article, loading, error, today };
}
