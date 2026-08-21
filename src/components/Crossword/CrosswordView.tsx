import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { shareCrossword } from '../../utils/share';
import type { CrosswordData, CrosswordClue, CrosswordProgress } from '../../types';
import { Check, Share2, Trophy } from 'lucide-react';
import './CrosswordView.css';

interface Props {
  data: CrosswordData;
  /** Where this puzzle's progress is stored. */
  progressKey: string;
  /** Human-readable week label shown in the header. */
  weekLabel: string;
}

type Dir = 'across' | 'down';

function cellKey(r: number, c: number) { return `${r}-${c}`; }

/**
 * Across and Down clues share numbers (9A and 9D are different clues), so the
 * clue number alone cannot identify a clue.
 */
function clueId(clue: CrosswordClue): string {
  return `${clue.position}-${clue.orientation}`;
}

function clueCells(clue: CrosswordClue): { r: number; c: number }[] {
  return Array.from({ length: clue.answer.length }, (_, i) => ({
    r: clue.orientation === 'across' ? clue.starty : clue.starty + i,
    c: clue.orientation === 'across' ? clue.startx + i : clue.startx,
  }));
}

function buildGrid(data: CrosswordData) {
  const cellClues: Record<string, CrosswordClue[]> = {};
  const cellNumbers: Record<string, number[]> = {};

  for (const clue of data.result) {
    for (const { r, c } of clueCells(clue)) {
      const k = cellKey(r, c);
      if (!cellClues[k]) cellClues[k] = [];
      cellClues[k].push(clue);
    }
    const startKey = cellKey(clue.starty, clue.startx);
    if (!cellNumbers[startKey]) cellNumbers[startKey] = [];
    cellNumbers[startKey].push(clue.position);
  }

  return { cellClues, cellNumbers };
}

export function CrosswordView({ data, progressKey, weekLabel }: Props) {
  const [progress, setProgress] = useLocalStorage<CrosswordProgress>(
    progressKey,
    { userLetters: {} }
  );

  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [dir, setDir] = useState<Dir>('across');
  const [showCheck, setShowCheck] = useState(false);
  const [justSolved, setJustSolved] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const { cellClues, cellNumbers, allCells } = useMemo(() => {
    const built = buildGrid(data);
    return { ...built, allCells: new Set(Object.keys(built.cellClues)) };
  }, [data]);

  const userLetters = progress.userLetters;

  /**
   * Derived from the letters on the board rather than stored alongside them,
   * so a clue is marked solved the moment its last letter lands.
   */
  const solvedIds = useMemo(() => {
    const solved = new Set<string>();
    for (const clue of data.result) {
      const filled = clueCells(clue).map(({ r, c }) => userLetters[cellKey(r, c)] ?? '').join('');
      if (filled === clue.answer) solved.add(clueId(clue));
    }
    return solved;
  }, [data, userLetters]);

  const totalClues = data.result.length;
  const solvedCount = solvedIds.size;
  const pct = totalClues ? Math.round((solvedCount / totalClues) * 100) : 0;
  const complete = totalClues > 0 && solvedCount === totalClues;

  // Pulse cells of clues that were just completed.
  const prevSolved = useRef(solvedIds);
  useEffect(() => {
    const newly = [...solvedIds].filter(id => !prevSolved.current.has(id));
    prevSolved.current = solvedIds;
    if (!newly.length) return;
    setJustSolved(newly);
    const t = setTimeout(() => setJustSolved([]), 600);
    return () => clearTimeout(t);
  }, [solvedIds]);

  const getActiveClue = useCallback((): CrosswordClue | null => {
    if (!selectedCell) return null;
    const clues = cellClues[cellKey(selectedCell.r, selectedCell.c)];
    if (!clues) return null;
    return clues.find(cl => cl.orientation === dir) ?? clues[0];
  }, [selectedCell, cellClues, dir]);

  const setLetter = useCallback((k: string, letter: string | null) => {
    setProgress(prev => {
      const userLetters = { ...prev.userLetters };
      if (letter === null) delete userLetters[k];
      else userLetters[k] = letter;
      return { ...prev, userLetters };
    });
  }, [setProgress]);

  const handleInput = useCallback((letter: string) => {
    if (!selectedCell) return;
    const k = cellKey(selectedCell.r, selectedCell.c);
    if (!allCells.has(k)) return;

    setLetter(k, letter.toUpperCase());

    // Advance the cursor to the next cell of the active clue.
    const ac = getActiveClue();
    if (ac) {
      const idx = ac.orientation === 'across'
        ? selectedCell.c - ac.startx
        : selectedCell.r - ac.starty;
      if (idx < ac.answer.length - 1) {
        setSelectedCell({
          r: ac.orientation === 'across' ? selectedCell.r : selectedCell.r + 1,
          c: ac.orientation === 'across' ? selectedCell.c + 1 : selectedCell.c,
        });
      }
    }
  }, [selectedCell, allCells, setLetter, getActiveClue]);

  const handleDelete = useCallback(() => {
    if (!selectedCell) return;
    const k = cellKey(selectedCell.r, selectedCell.c);

    if (userLetters[k]) {
      setLetter(k, null);
      return;
    }

    // Empty cell — step back and clear the previous one.
    const ac = getActiveClue();
    if (!ac) return;
    const idx = ac.orientation === 'across'
      ? selectedCell.c - ac.startx
      : selectedCell.r - ac.starty;
    if (idx <= 0) return;

    const nr = ac.orientation === 'across' ? selectedCell.r : selectedCell.r - 1;
    const nc = ac.orientation === 'across' ? selectedCell.c - 1 : selectedCell.c;
    setSelectedCell({ r: nr, c: nc });
    setLetter(cellKey(nr, nc), null);
  }, [selectedCell, userLetters, setLetter, getActiveClue]);

  /** Steps over blocked squares instead of stopping at them. */
  const move = useCallback((dr: number, dc: number) => {
    if (!selectedCell) return;
    let { r, c } = selectedCell;
    for (let i = 0; i < Math.max(data.rows, data.cols); i++) {
      r += dr;
      c += dc;
      if (r < 1 || r > data.rows || c < 1 || c > data.cols) return;
      if (allCells.has(cellKey(r, c))) {
        setSelectedCell({ r, c });
        return;
      }
    }
  }, [selectedCell, allCells, data.rows, data.cols]);

  const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    {
      if (!selectedCell) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setDir('across');
        move(0, 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDir('across');
        move(0, -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDir('down');
        move(1, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDir('down');
        move(-1, 0);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setDir(d => (d === 'across' ? 'down' : 'across'));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      }
    }
  }, [selectedCell, handleInput, handleDelete, move]);

  // Physical keyboards work whether or not the proxy input holds focus, but the
  // input's own handler owns the keys it receives so nothing is applied twice.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target === inputRef.current) return;
      handleKeyDown(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyDown]);

  function selectCell(r: number, c: number, toggle = true) {
    if (!allCells.has(cellKey(r, c))) return;
    if (toggle && selectedCell?.r === r && selectedCell.c === c) {
      setDir(d => (d === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell({ r, c });
    }
    // Focusing the proxy input is what opens the on-screen keyboard on phones.
    inputRef.current?.focus({ preventScroll: true });
  }

  function handleRevealWord() {
    const ac = getActiveClue();
    if (!ac) return;
    setProgress(prev => {
      const userLetters = { ...prev.userLetters };
      clueCells(ac).forEach(({ r, c }, i) => {
        userLetters[cellKey(r, c)] = ac.answer[i];
      });
      return { ...prev, userLetters };
    });
  }

  function handleCheckAnswers() {
    setShowCheck(true);
    setTimeout(() => setShowCheck(false), 3000);
  }

  function handleClearAll() {
    setProgress({ userLetters: {} });
    setSelectedCell(null);
  }

  function isInActiveWord(r: number, c: number): boolean {
    const ac = getActiveClue();
    if (!ac) return false;
    return clueCells(ac).some(cell => cell.r === r && cell.c === c);
  }

  function cellCheckStatus(r: number, c: number): 'correct' | 'wrong' | null {
    if (!showCheck) return null;
    const k = cellKey(r, c);
    const letter = userLetters[k];
    if (!letter) return null;
    const clues = cellClues[k];
    if (!clues) return null;
    const first = clues[0];
    const expected = first.answer[
      first.orientation === 'across' ? c - first.startx : r - first.starty
    ];
    return letter === expected ? 'correct' : 'wrong';
  }

  const activeClue = getActiveClue();
  const across = data.result.filter(c => c.orientation === 'across').sort((a, b) => a.position - b.position);
  const down = data.result.filter(c => c.orientation === 'down').sort((a, b) => a.position - b.position);

  function renderClueList(clues: CrosswordClue[], orientation: Dir) {
    return clues.map(cl => {
      const solved = solvedIds.has(clueId(cl));
      const isActive = activeClue?.position === cl.position && activeClue.orientation === orientation;
      return (
        <button
          type="button"
          key={clueId(cl)}
          className={`cw-ci${solved ? ' done' : ''}${isActive ? ' active-clue' : ''}`}
          aria-current={isActive ? 'true' : undefined}
          onClick={() => {
            setDir(orientation);
            setSelectedCell({ r: cl.starty, c: cl.startx });
            inputRef.current?.focus({ preventScroll: true });
          }}
        >
          <span className="cw-ci-n">{cl.position}.</span>
          <span className="cw-ci-text">{cl.clue}</span>
          {solved && <span className="cw-ci-tick" aria-hidden="true"><Check /></span>}
        </button>
      );
    });
  }

  return (
    <div className="cw-wrap">
      {complete ? (
        <div className="cw-complete">
          <div className="cw-complete-icon" aria-hidden="true"><Trophy /></div>
          <h2>Puzzle complete!</h2>
          <p>You solved this week's crossword.</p>
          <div className="cw-complete-stats">
            <div className="cw-complete-stat">
              <div className="v">{totalClues}</div>
              <div className="l">Clues</div>
            </div>
            <div className="cw-complete-stat">
              <div className="v">100%</div>
              <div className="l">Complete</div>
            </div>
          </div>
          <div className="cw-complete-btns">
            <button
              className="cw-btn cw-btn-primary"
              onClick={() => shareCrossword(totalClues, weekLabel)}
            >
              <Share2 aria-hidden="true" />
              Share
            </button>
            <button className="cw-btn cw-btn-danger" onClick={handleClearAll}>
              Start over
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="cw-header">
            <div className="cw-title-row">
              <h2 className="cw-title">Crossword</h2>
              <div className="cw-week">{weekLabel}</div>
            </div>
            <div className="cw-progress-wrap">
              <div className="cw-progress-top">
                <span className="cw-progress-pct">{pct}%</span>
                <span className="cw-progress-counts">{solvedCount}/{totalClues} clues</span>
              </div>
              <div
                className="cw-progress-track"
                role="progressbar"
                aria-label="Clues solved"
                aria-valuemin={0}
                aria-valuemax={totalClues}
                aria-valuenow={solvedCount}
              >
                <div className="cw-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="cw-active-clue">
            {activeClue ? (
              <>
                <span className="cw-active-num">{activeClue.position}{activeClue.orientation === 'across' ? 'A' : 'D'}</span>
                <span className="cw-active-text">{activeClue.clue}</span>
                <span className="cw-active-len">({activeClue.answer.length})</span>
              </>
            ) : (
              <span className="cw-active-text cw-active-hint">
                Pick a square or a clue to start. Tap a selected square again to switch between across and down.
              </span>
            )}
          </div>

          <div className="cw-toolbar">
            <button className="cw-btn" onClick={handleCheckAnswers}>Check</button>
            <button className="cw-btn" onClick={handleRevealWord} disabled={!activeClue}>Reveal word</button>
            <button className="cw-btn cw-btn-danger" onClick={handleClearAll}>Clear all</button>
          </div>

          {/*
            Proxy input that carries focus for the grid: it is what raises the
            on-screen keyboard on phones, so it must stay focusable (never
            readonly or aria-hidden).
          */}
          <input
            ref={inputRef}
            className="cw-hidden-input"
            type="text"
            value=""
            inputMode="text"
            enterKeyHint="next"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label={activeClue
              ? `${activeClue.position} ${activeClue.orientation}: ${activeClue.clue}. ${activeClue.answer.length} letters.`
              : 'Crossword letter entry'}
            onChange={e => {
              // Android soft keyboards often fire only input events, no keydown.
              const letter = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1);
              if (letter) handleInput(letter);
            }}
            onKeyDown={handleKeyDown}
          />

          <div className="cw-grid-scroll">
            <div
              className="cw-grid"
              role="grid"
              aria-label="Crossword grid"
              style={{
                '--cw-cols': data.cols,
                '--cw-rows': data.rows,
                gridTemplateColumns: `repeat(${data.cols}, minmax(0, 1fr))`,
              } as React.CSSProperties}
            >
              {Array.from({ length: data.rows }, (_, ri) =>
                Array.from({ length: data.cols }, (_, ci) => {
                  const r = ri + 1;
                  const c = ci + 1;
                  const k = cellKey(r, c);
                  const isOpen = allCells.has(k);
                  const isSelected = selectedCell?.r === r && selectedCell.c === c;
                  const inWord = isInActiveWord(r, c);
                  const checkStatus = cellCheckStatus(r, c);
                  const nums = cellNumbers[k] ?? [];
                  const clues = cellClues[k] ?? [];
                  const isSolved = isOpen && clues.length > 0
                    && clues.every(cl => solvedIds.has(clueId(cl)));
                  const pulsing = clues.some(cl => justSolved.includes(clueId(cl)));
                  const letter = userLetters[k] ?? '';

                  return (
                    <div
                      key={k}
                      className={[
                        'cw-cell',
                        isOpen ? 'open' : 'block',
                        isSelected ? 'selected' : '',
                        inWord && !isSelected ? 'in-word' : '',
                        isSolved && !isSelected ? 'solved' : '',
                        pulsing ? 'just-solved' : '',
                        checkStatus === 'correct' ? 'check-correct' : '',
                        checkStatus === 'wrong' ? 'check-wrong' : '',
                      ].filter(Boolean).join(' ')}
                      // Keep focus on the proxy input so the keyboard stays up,
                      // without blocking touch scrolling over the grid.
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { if (isOpen) selectCell(r, c); }}
                      role={isOpen ? 'gridcell' : 'presentation'}
                      aria-selected={isOpen ? isSelected : undefined}
                      aria-label={isOpen ? `Row ${r} column ${c}${letter ? `, ${letter}` : ', empty'}` : undefined}
                    >
                      {nums.length > 0 && (
                        <span className="cw-cell-num">{Math.min(...nums)}</span>
                      )}
                      {letter && <span className="cw-cell-letter">{letter}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="cw-clues-wrap">
            <div className="cw-clue-col">
              <div className="cw-col-heading">Across</div>
              {renderClueList(across, 'across')}
            </div>
            <div className="cw-clue-col">
              <div className="cw-col-heading">Down</div>
              {renderClueList(down, 'down')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
