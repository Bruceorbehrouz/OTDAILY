import type { AppView } from '../../types';
import { formatDate } from '../../utils/date';
import { FEATURES } from '../../config/features';
import './Header.css';

interface Props {
  activeView: AppView;
  today: string;
  onViewChange: (view: AppView) => void;
}

const NAV: { view: AppView; label: string; shortLabel: string }[] = [
  { view: 'research', label: 'Research', shortLabel: 'Research' },
  { view: 'physle', label: 'Wordle', shortLabel: 'Wordle' },
  { view: 'crossword', label: 'Crossword', shortLabel: 'CW' },
  { view: 'saved', label: 'Saved', shortLabel: 'Saved' },
  { view: 'about', label: 'About', shortLabel: 'About' },
];

const ENABLED_NAV = NAV.filter(item => {
  if (item.view === 'physle') return FEATURES.wordle;
  if (item.view === 'crossword') return FEATURES.crossword;
  if (item.view === 'saved') return FEATURES.saved;
  return true;
});

export function Header({ activeView, today, onViewChange }: Props) {
  return (
    <header className="hero">
      <div className="hero-inner">
        <div className="hero-brand">
          <div className="hero-eyebrow">
            <span className="hero-dot" />
            <span className="hero-eyebrow-text">Updated daily</span>
          </div>
          <h1 className="hero-title">OT Research <em>Daily</em></h1>
          <div className="hero-date">{formatDate(today)}</div>
        </div>
        <nav className="hero-nav" aria-label="Main navigation">
          {ENABLED_NAV.map(({ view, label, shortLabel }) => (
            <button
              key={view}
              className={`section-tab${activeView === view ? ' active' : ''}`}
              onClick={() => onViewChange(view)}
              aria-current={activeView === view ? 'page' : undefined}
            >
              <span className="tab-label-full">{label}</span>
              <span className="tab-label-short">{shortLabel}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
