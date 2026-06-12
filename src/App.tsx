import { useState, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { ArticleView } from './components/Article/ArticleView';
import { PhysleView } from './components/Physle/PhysleView';
import { CrosswordView } from './components/Crossword/CrosswordView';
import { Sidebar } from './components/Sidebar/Sidebar';
import { SavedView } from './components/Views/SavedView';
import { AboutView } from './components/Views/AboutView';
import { useArticle } from './hooks/useArticle';
import { useBookmarks } from './hooks/useBookmarks';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { AppView, CrosswordData, PhysleState } from './types';
import { FileText } from 'lucide-react';
import { FEATURES } from './config/features';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('research');
  const [crosswordData, setCrosswordData] = useState<CrosswordData | null>(null);
  const { article, loading, error, today } = useArticle();
  const { bookmarks, toggle, isBookmarked } = useBookmarks();

  const [physleState] = useLocalStorage<PhysleState>(
    `physle_v2_${today}`,
    { guesses: [], current: '', done: false, won: false }
  );

  useEffect(() => {
    fetch('/crossword.json')
      .then(r => r.json())
      .then(setCrosswordData)
      .catch(console.error);
  }, []);

  function renderMain() {
    switch (activeView) {
      case 'research':
        if (loading) return (
          <div className="card-loading">
            <div className="spinner" />
            <p>Loading today's article…</p>
          </div>
        );
        if (error || !article) return (
          <div className="card-empty">
            <div className="card-empty-icon" aria-hidden="true"><FileText /></div>
            <div className="card-empty-title">No article today</div>
            <div className="card-empty-sub">
              Add <code>public/articles/{today}.json</code> to publish today's article.
            </div>
          </div>
        );
        return (
          <ArticleView
            article={article}
            isBookmarked={isBookmarked(article, 'daily')}
            onBookmark={() => toggle(article, 'daily')}
            savedEnabled={FEATURES.saved}
            textToSpeechEnabled={FEATURES.textToSpeech}
          />
        );
      case 'physle':
        return FEATURES.wordle ? <PhysleView /> : null;
      case 'crossword':
        if (!FEATURES.crossword) return null;
        if (!crosswordData) return <div className="card-loading"><div className="spinner" /></div>;
        return <CrosswordView data={crosswordData} />;
      case 'saved':
        if (!FEATURES.saved) return null;
        return (
          <SavedView
            bookmarks={bookmarks}
            onRemove={bm => toggle(bm.article, bm.categoryId)}
          />
        );
      case 'about':
        return <AboutView />;
    }
  }

  return (
    <div className="app">
      <Header activeView={activeView} today={today} onViewChange={setActiveView} />
      <div className="layout">
        <main className="main-col">
          <div className="card">
            {renderMain()}
          </div>
        </main>
        <Sidebar
          bookmarks={bookmarks}
          physleWon={physleState.won}
          physleGuesses={physleState.guesses.length}
          physleDone={physleState.done}
          onViewChange={setActiveView}
          wordleEnabled={FEATURES.wordle}
          savedEnabled={FEATURES.saved}
        />
      </div>
      <footer className="page-footer">
        Research summaries are AI-assisted and reviewed. Always consult a qualified occupational therapy practitioner for clinical decisions.
      </footer>
    </div>
  );
}
