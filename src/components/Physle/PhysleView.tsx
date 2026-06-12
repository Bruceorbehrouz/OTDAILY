import { usePhysle } from '../../hooks/usePhysle';
import { WORD_DEFS } from '../../data/words';
import { sharePhysle } from '../../utils/share';
import { Delete, Share2 } from 'lucide-react';
import './PhysleView.css';

const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','DEL'],
];

export function PhysleView() {
  const {
    word, state, grid, letterStatuses, streak, shake, reveal,
    toast, calendar, currentRowIndex, addLetter, deleteLetter, submitGuess,
  } = usePhysle();

  const def = WORD_DEFS[word];

  return (
    <div className="physle-wrap">
      {toast && <div className="physle-toast">{toast}</div>}

      <div className="physle-header">
        <div className="physle-title">Wordle</div>
        <div className="physle-subtitle">Anatomy word game with 6 guesses</div>
      </div>

      <div className="physle-streak-row">
        <div className="streak-stat">
          <span className="streak-num">{streak.count}</span>
          <span className="streak-label">Streak</span>
        </div>
        <div className="physle-calendar">
          {calendar.map(({ label, isToday, solved }, i) => (
            <div
              key={i}
              className={`cal-day${isToday ? ' today' : ''}${solved ? ' solved' : ''}`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="streak-stat">
          <span className="streak-num">{streak.best}</span>
          <span className="streak-label">Best</span>
        </div>
      </div>

      <div className="physle-grid" role="grid">
        {grid.map((row, ri) => (
          <div
            key={ri}
            className={`physle-row${ri === currentRowIndex && shake ? ' shake' : ''}${ri === currentRowIndex - 1 && reveal ? ' reveal' : ''}`}
            role="row"
          >
            {row.map(({ letter, status }, ci) => (
              <div
                key={ci}
                className={`physle-cell ${status}`}
                role="gridcell"
                data-letter={letter}
                style={{ '--delay': `${ci * 0.1}s` } as React.CSSProperties}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {state.done && def && (
        <div className="physle-def">
          <span className="physle-def-word">{word}</span>
          <span className="physle-def-text">{def}</span>
        </div>
      )}

      {state.done && (
        <div className="physle-done-actions">
          <button
            className="physle-share-btn"
            onClick={() => sharePhysle(
              grid.filter((_, i) => i < state.guesses.length),
              state.won,
              streak.count,
            )}
          >
            <Share2 aria-hidden="true" />
            Share result
          </button>
        </div>
      )}

      <div className="physle-keyboard" role="group" aria-label="Keyboard">
        {KB_ROWS.map((row, ri) => (
          <div key={ri} className="kb-row">
            {row.map(key => {
              const status = letterStatuses[key];
              return (
                <button
                  key={key}
                  className={`kb-key${key.length > 1 ? ' wide' : ''}${status ? ` ${status}` : ''}`}
                  onClick={() => {
                    if (key === 'ENTER') submitGuess();
                    else if (key === 'DEL') deleteLetter();
                    else addLetter(key);
                  }}
                  aria-label={key === 'DEL' ? 'Delete' : key}
                >
                  {key === 'DEL' ? <Delete aria-hidden="true" /> : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
