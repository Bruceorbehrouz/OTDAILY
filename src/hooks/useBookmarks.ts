import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { BookmarkStore, Article } from '../types';

const KEY = 'physio_bookmarks_v4';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useLocalStorage<BookmarkStore>(KEY, {});

  const toggle = useCallback((article: Article, categoryId: string) => {
    const key = `${categoryId}__${article.pmid ?? article.title.slice(0, 20)}`;
    setBookmarks(prev => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: { article, categoryId, savedAt: new Date().toISOString() },
      };
    });
  }, [setBookmarks]);

  const isBookmarked = useCallback((article: Article, categoryId: string) => {
    const key = `${categoryId}__${article.pmid ?? article.title.slice(0, 20)}`;
    return !!bookmarks[key];
  }, [bookmarks]);

  const all = Object.values(bookmarks).sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt)
  );

  return { bookmarks: all, toggle, isBookmarked };
}
