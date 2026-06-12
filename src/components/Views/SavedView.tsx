import type { Bookmark } from '../../types';
import { Bookmark as BookmarkIcon, ExternalLink, X } from 'lucide-react';
import './SavedView.css';

interface Props {
  bookmarks: Bookmark[];
  onRemove: (bm: Bookmark) => void;
}

export function SavedView({ bookmarks, onRemove }: Props) {
  if (bookmarks.length === 0) {
    return (
      <div className="saved-empty">
        <div className="saved-empty-icon" aria-hidden="true"><BookmarkIcon /></div>
        <div className="saved-empty-title">No saved articles</div>
        <div className="saved-empty-sub">Tap the save button on any article to bookmark it here.</div>
      </div>
    );
  }

  return (
    <div className="saved-view">
      <div className="saved-header">
        <h2 className="saved-title">Saved Articles</h2>
        <span className="saved-count">{bookmarks.length}</span>
      </div>
      <div className="saved-list">
        {bookmarks.map((bm, i) => (
          <div key={i} className="saved-item">
            <div className="saved-item-meta-row">
              {bm.article.studyType && (
                <span className="saved-badge">{bm.article.studyType}</span>
              )}
              <button
                className="saved-remove"
                onClick={() => onRemove(bm)}
                title="Remove bookmark"
                aria-label="Remove bookmark"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="saved-item-title">{bm.article.title}</div>
            <div className="saved-item-byline">
              {bm.article.authors} · {bm.article.journal}, {bm.article.year}
            </div>
            {bm.article.doiUrl && (
              <a href={bm.article.doiUrl} target="_blank" rel="noopener noreferrer" className="saved-doi">
                View paper <ExternalLink aria-hidden="true" />
              </a>
            )}
            <p className="saved-summary">{bm.article.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
