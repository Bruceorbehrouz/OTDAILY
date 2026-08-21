import { useState } from 'react';
import { Header } from './components/Header/Header';
import { ArticleView } from './components/Article/ArticleView';
import { PhysleView } from './components/Physle/PhysleView';
import { CrosswordView } from './components/Crossword/CrosswordView';
import { Sidebar } from './components/Sidebar/Sidebar';
import { SavedView } from './components/Views/SavedView';
import { AboutView } from './components/Views/AboutView';
import { useArticle } from './hooks/useArticle';
import { useCrossword } from './hooks/useCrossword';
import { useBookmarks } from './hooks/useBookmarks';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { AppView, PhysleState } from './types';
import { FileText } from 'lucide-react';
import { FEATURES } from './config/features';
import { weekLabel } from './utils/date';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('research');
  const { article, articleDate, isArchive, loading, error, today } = useArticle();
  const crossword = useCrossword(FEATURES.crossword);
  const { bookmarks, toggle, isBookmarked } = useBookmarks();

  const [physleState] = useLocalStorage<PhysleState>(
    `physle_v2_${today}`,
    { guesses: [], current: '', done: false, won: false }
  );

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
            <div className="card-empty-title">No article to show yet</div>
            <div className="card-empty-sub">
              Today's summary isn't available right now. Please check back shortly —
              in the meantime, the crossword and word game are ready to play.
            </div>
          </div>
        );
        return (
          <ArticleView
            article={article}
            publishedOn={articleDate}
            isArchive={isArchive}
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
        if (crossword.error) return (
          <div className="card-empty">
            <div className="card-empty-icon" aria-hidden="true"><FileText /></div>
            <div className="card-empty-title">Crossword unavailable</div>
            <div className="card-empty-sub">
              This week's puzzle could not be loaded. Please try again later.
            </div>
          </div>
        );
        if (!crossword.data || !crossword.progressKey) return (
          <div className="card-loading">
            <div className="spinner" />
            <p>Loading this week's crossword…</p>
          </div>
        );
        return (
          <CrosswordView
            data={crossword.data}
            progressKey={crossword.progressKey}
            weekLabel={weekLabel()}
          />
        );
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
