import type { Bookmark, AppView } from '../../types';
import { Bookmark as BookmarkIcon, Brain, Info, List, PlayCircle } from 'lucide-react';
import { AccessibilitySettings } from '../Settings/AccessibilitySettings';
import './Sidebar.css';

interface Props {
  bookmarks: Bookmark[];
  physleWon: boolean;
  physleGuesses: number;
  physleDone: boolean;
  onViewChange: (view: AppView) => void;
  wordleEnabled: boolean;
  savedEnabled: boolean;
}

export function Sidebar({
  bookmarks,
  physleWon,
  physleGuesses,
  physleDone,
  onViewChange,
  wordleEnabled,
  savedEnabled,
}: Props) {
  const recentBookmarks = bookmarks.slice(0, 3);

  return (
    <aside className="sidebar">
      {wordleEnabled && (
        <div className="sidebar-card">
          <div className="sidebar-card-body">
            <div className="sidebar-heading"><Brain aria-hidden="true" /> Wordle</div>
            {physleDone ? (
              <div className="physle-mini-done">
                {physleWon
                  ? `Solved in ${physleGuesses} guess${physleGuesses === 1 ? '' : 'es'}`
                  : 'Better luck tomorrow!'}
              </div>
            ) : (
              <div className="physle-mini-prompt">Anatomy word game with 5 letters and 6 guesses</div>
            )}
            <button className="sidebar-play-btn" onClick={() => onViewChange('physle')}>
              <PlayCircle aria-hidden="true" />
              <span>{physleDone ? 'View result' : "Play today's word"}</span>
            </button>
          </div>
        </div>
      )}

      {savedEnabled && (
        <div className="sidebar-card">
          <div className="sidebar-card-body">
            <div className="sidebar-heading"><BookmarkIcon aria-hidden="true" /> Saved articles</div>
            {recentBookmarks.length === 0 ? (
              <div className="sidebar-empty">No saved articles yet.</div>
            ) : (
              <>
                {recentBookmarks.map((bm, i) => (
                  <div key={i} className="sidebar-bookmark">
                    <div className="sidebar-bookmark-title">{bm.article.title}</div>
                    <div className="sidebar-bookmark-meta">
                      {bm.article.journal}, {bm.article.year}
                    </div>
                  </div>
                ))}
                {bookmarks.length > 3 && (
                  <button className="sidebar-view-all" onClick={() => onViewChange('saved')}>
                    <List aria-hidden="true" />
                    <span>View all {bookmarks.length}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <AccessibilitySettings />

      {/* About */}
      <div className="sidebar-card sidebar-card-clickable" onClick={() => onViewChange('about')}>
        <div className="sidebar-card-body sidebar-about-row">
          <div className="sidebar-about-icon">
            <Info aria-hidden="true" />
          </div>
          <div>
            <div className="sidebar-about-title">About</div>
            <div className="sidebar-about-sub">About this app</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
