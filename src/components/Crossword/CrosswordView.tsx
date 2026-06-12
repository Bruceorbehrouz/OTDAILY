import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { cwWeekKey } from '../../utils/date';
import { shareCrossword } from '../../utils/share';
import type { CrosswordData, CrosswordClue, CrosswordProgress } from '../../types';
import { Check, Share2, Trophy } from 'lucide-react';
import './CrosswordView.css';

interface Props {
  data: CrosswordData;
}

type Dir = 'across' | 'down';

function buildGrid(data: CrosswordData) {
  const grid: (CrosswordClue[] | null)[][] = Array.from({ length: data.rows + 1 }, () =>
    Array(data.cols + 1).fill(null)
  );
  const cellClues: Record<string, CrosswordClue[]> = {};
  const cellNumbers: Record<string, number[]> = {};

  for (const clue of data.result) {
    const { answer, startx, starty, orientation } = clue;
    for (let i = 0; i < answer.length; i++) {
      const r = orientation === 'across' ? starty : starty + i;
      const c = orientation === 'across' ? startx + i : startx;
      const k = `${r}-${c}`;
      if (!cellClues[k]) cellClues[k] = [];
      cellClues[k].push(clue);
    }
    const startKey = `${starty}-${startx}`;
    if (!cellNumbers[startKey]) cellNumbers[startKey] = [];
    cellNumbers[startKey].push(clue.position);
  }

  return { grid, cellClues, cellNumbers };
}

export function CrosswordView({ data }: Props) {
  const weekKey = cwWeekKey();
  const [progress, setProgress] = useLocalStorage<CrosswordProgress>(
    `physio_crossword_${weekKey}`,
    { userLetters: {}, solvedClues: [] }
  );

  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [dir, setDir] = useState<Dir>('across');
  const [showCheck, setShowCheck] = useState(false);
  const [justSolved, setJustSolved] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const { cellClues, cellNumbers, allCells } = useMemo(() => {
    const built = buildGrid(data);
    return { ...built, allCells: new Set(Object.keys(built.cellClues)) };
  }, [data]);
  const totalClues = data.result.length;
  const solvedCount = progress.solvedClues.length;
  const pct = Math.round((solvedCount / totalClues) * 100);
  const complete = solvedCount === totalClues;

  function cellKey(r: number, c: number) { return `${r}-${c}`; }

  function getActiveClue(): CrosswordClue | null {
    if (!selectedCell) return null;
    const k = cellKey(selectedCell.r, selectedCell.c);
    const clues = cellClues[k];
    if (!clues) return null;
    return clues.find(cl => cl.orientation === dir) ?? clues[0];
  }

  function getClueWord(clue: CrosswordClue): string[] {
    return Array.from({ length: clue.answer.length }, (_, i) => {
      const r = clue.orientation === 'across' ? clue.starty : clue.starty + i;
      const c = clue.orientation === 'across' ? clue.startx + i : clue.startx;
      return progress.userLetters[cellKey(r, c)] ?? '';
    });
  }

  function checkClue(clue: CrosswordClue): boolean {
    const filled = getClueWord(clue);
    return filled.join('') === clue.answer;
  }

  function checkSolved() {
    const solved: number[] = [];
    for (const clue of data.result) {
      if (checkClue(clue)) solved.push(clue.position);
    }
    return solved;
  }

  const handleInput = useCallback((letter: string) => {
    if (!selectedCell) return;
    const k = cellKey(selectedCell.r, selectedCell.c);
    if (!allCells.has(k)) return;

    setProgress(prev => {
      const next = { ...prev, userLetters: { ...prev.userLetters, [k]: letter.toUpperCase() } };
      const solved = checkSolved();
      const newlySolved = solved.filter(p => !prev.solvedClues.includes(p));
      if (newlySolved.length) {
        setJustSolved(newlySolved);
        setTimeout(() => setJustSolved([]), 600);
      }
      return { ...next, solvedClues: solved };
    });

    // Advance cursor
    const ac = getActiveClue();
    if (ac) {
      const idx = ac.orientation === 'across'
        ? selectedCell.c - ac.startx
        : selectedCell.r - ac.starty;
      if (idx < ac.answer.length - 1) {
        const nr = ac.orientation === 'across' ? selectedCell.r : selectedCell.r + 1;
        const nc = ac.orientation === 'across' ? selectedCell.c + 1 : selectedCell.c;
        setSelectedCell({ r: nr, c: nc });
      }
    }
  }, [selectedCell, allCells, setProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(() => {
    if (!selectedCell) return;
    const k = cellKey(selectedCell.r, selectedCell.c);
    const hasCurrent = !!progress.userLetters[k];

    if (hasCurrent) {
      setProgress(prev => {
        const next = { ...prev, userLetters: { ...prev.userLetters } };
        delete next.userLetters[k];
        return { ...next, solvedClues: checkSolved() };
      });
    } else {
      // Move back
      const ac = getActiveClue();
      if (ac) {
        const idx = ac.orientation === 'across'
          ? selectedCell.c - ac.startx
          : selectedCell.r - ac.starty;
        if (idx > 0) {
          const nr = ac.orientation === 'across' ? selectedCell.r : selectedCell.r - 1;
          const nc = ac.orientation === 'across' ? selectedCell.c - 1 : selectedCell.c;
          setSelectedCell({ r: nr, c: nc });
          const prevKey = cellKey(nr, nc);
          setProgress(prev => {
            const next = { ...prev, userLetters: { ...prev.userLetters } };
            delete next.userLetters[prevKey];
            return next;
          });
        }
      }
    }
  }, [selectedCell, progress.userLetters, setProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setDir('across');
        const nr = { r: selectedCell.r, c: Math.min(selectedCell.c + 1, data.cols) };
        if (allCells.has(cellKey(nr.r, nr.c))) setSelectedCell(nr);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDir('across');
        const nr = { r: selectedCell.r, c: Math.max(selectedCell.c - 1, 1) };
        if (allCells.has(cellKey(nr.r, nr.c))) setSelectedCell(nr);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDir('down');
        const nr = { r: Math.min(selectedCell.r + 1, data.rows), c: selectedCell.c };
        if (allCells.has(cellKey(nr.r, nr.c))) setSelectedCell(nr);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDir('down');
        const nr = { r: Math.max(selectedCell.r - 1, 1), c: selectedCell.c };
        if (allCells.has(cellKey(nr.r, nr.c))) setSelectedCell(nr);
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleInput(e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedCell, dir, allCells, data, handleInput, handleDelete]);

  function handleCellClick(r: number, c: number) {
    const k = cellKey(r, c);
    if (!allCells.has(k)) return;
    if (selectedCell?.r === r && selectedCell.c === c) {
      setDir(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ r, c });
    }
    inputRef.current?.focus();
  }

  function handleRevealWord() {
    const ac = getActiveClue();
    if (!ac) return;
    setProgress(prev => {
      const next = { ...prev, userLetters: { ...prev.userLetters } };
      for (let i = 0; i < ac.answer.length; i++) {
        const r = ac.orientation === 'across' ? ac.starty : ac.starty + i;
        const c = ac.orientation === 'across' ? ac.startx + i : ac.startx;
        next.userLetters[cellKey(r, c)] = ac.answer[i];
      }
      return { ...next, solvedClues: checkSolved() };
    });
  }

  function handleCheckAnswers() {
    setShowCheck(true);
    setTimeout(() => setShowCheck(false), 3000);
  }

  function handleClearAll() {
    setProgress({ userLetters: {}, solvedClues: [] });
    setSelectedCell(null);
  }

  function isInActiveWord(r: number, c: number): boolean {
    const ac = getActiveClue();
    if (!ac) return false;
    for (let i = 0; i < ac.answer.length; i++) {
      const cr = ac.orientation === 'across' ? ac.starty : ac.starty + i;
      const cc = ac.orientation === 'across' ? ac.startx + i : ac.startx;
      if (cr === r && cc === c) return true;
    }
    return false;
  }

  function cellCheckStatus(r: number, c: number): 'correct' | 'wrong' | null {
    if (!showCheck) return null;
    const k = cellKey(r, c);
    const letter = progress.userLetters[k];
    if (!letter) return null;
    const clues = cellClues[k];
    if (!clues) return null;
    const expected = clues[0].answer[
      clues[0].orientation === 'across'
        ? c - clues[0].startx
        : r - clues[0].starty
    ];
    return letter === expected ? 'correct' : 'wrong';
  }

  const activeClue = getActiveClue();
  const across = data.result.filter(c => c.orientation === 'across').sort((a,b) => a.position - b.position);
  const down = data.result.filter(c => c.orientation === 'down').sort((a,b) => a.position - b.position);

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
              onClick={() => shareCrossword(totalClues, weekKey)}
            >
              <Share2 aria-hidden="true" />
              Share
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="cw-header">
            <div className="cw-title-row">
              <div className="cw-title">Crossword</div>
              <div className="cw-week">Week {weekKey}</div>
            </div>
            <div className="cw-progress-wrap">
              <div className="cw-progress-top">
                <span className="cw-progress-pct">{pct}%</span>
                <span className="cw-progress-counts">{solvedCount}/{totalClues} clues</span>
              </div>
              <div className="cw-progress-track">
                <div className="cw-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {activeClue && (
            <div className="cw-active-clue">
              <span className="cw-active-num">{activeClue.position}{activeClue.orientation === 'across' ? 'A' : 'D'}</span>
              <span className="cw-active-text">{activeClue.clue}</span>
              <span className="cw-active-len">({activeClue.answer.length})</span>
            </div>
          )}

          <div className="cw-toolbar">
            <button className="cw-btn" onClick={handleCheckAnswers}>Check</button>
            <button className="cw-btn" onClick={handleRevealWord}>Reveal word</button>
            <button className="cw-btn cw-btn-danger" onClick={handleClearAll}>Clear all</button>
          </div>

          <div className="cw-grid-scroll">
            <div
              className="cw-grid"
              style={{
                gridTemplateColumns: `repeat(${data.cols}, var(--cw-cell-size, 34px))`,
                gridTemplateRows: `repeat(${data.rows}, var(--cw-cell-size, 34px))`,
              }}
            >
              {Array.from({ length: data.rows }, (_, ri) =>
                Array.from({ length: data.cols }, (_, ci) => {
                  const r = ri + 1;
                  const c = ci + 1;
                  const k = cellKey(r, c);
                  const isActive = allCells.has(k);
                  const isSelected = selectedCell?.r === r && selectedCell.c === c;
                  const inWord = isInActiveWord(r, c);
                  const checkStatus = cellCheckStatus(r, c);
                  const nums = cellNumbers[k] ?? [];
                  const isSolved = progress.solvedClues.some(pos =>
                    cellClues[k]?.some(cl => cl.position === pos && cl.orientation === dir)
                  );
                  const letter = progress.userLetters[k] ?? '';

                  return (
                    <div
                      key={k}
                      className={[
                        'cw-cell',
                        isActive ? 'active' : 'black',
                        isSelected ? 'selected' : '',
                        inWord && !isSelected ? 'in-word' : '',
                        isSolved && !isSelected ? 'solved' : '',
                        justSolved.some(pos => cellClues[k]?.some(cl => cl.position === pos)) ? 'just-solved' : '',
                        checkStatus === 'correct' ? 'check-correct' : '',
                        checkStatus === 'wrong' ? 'check-wrong' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleCellClick(r, c)}
                      role={isActive ? 'button' : undefined}
                      aria-label={isActive ? `Row ${r}, Column ${c}` : undefined}
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

          {/* Hidden input for mobile keyboard */}
          <input
            ref={inputRef}
            className="cw-hidden-input"
            onKeyDown={e => {
              if (e.key === 'Backspace') { e.preventDefault(); handleDelete(); }
              else if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); handleInput(e.key); }
            }}
            readOnly
            aria-hidden
          />

          <div className="cw-clues-wrap">
            <div className="cw-clue-col">
              <div className="cw-col-heading">Across</div>
              {across.map(cl => (
                <div
                  key={cl.position}
                  className={`cw-ci${progress.solvedClues.includes(cl.position) ? ' done' : ''}${activeClue?.position === cl.position && activeClue.orientation === 'across' ? ' active-clue' : ''}`}
                  onClick={() => {
                    setDir('across');
                    setSelectedCell({ r: cl.starty, c: cl.startx });
                  }}
                >
                  <span className="cw-ci-n">{cl.position}.</span>
                  <span className="cw-ci-text">{cl.clue}</span>
                  {progress.solvedClues.includes(cl.position) && (
                    <span className="cw-ci-tick" aria-hidden="true"><Check /></span>
                  )}
                </div>
              ))}
            </div>
            <div className="cw-clue-col">
              <div className="cw-col-heading">Down</div>
              {down.map(cl => (
                <div
                  key={cl.position}
                  className={`cw-ci${progress.solvedClues.includes(cl.position) ? ' done' : ''}${activeClue?.position === cl.position && activeClue.orientation === 'down' ? ' active-clue' : ''}`}
                  onClick={() => {
                    setDir('down');
                    setSelectedCell({ r: cl.starty, c: cl.startx });
                  }}
                >
                  <span className="cw-ci-n">{cl.position}.</span>
                  <span className="cw-ci-text">{cl.clue}</span>
                  {progress.solvedClues.includes(cl.position) && (
                    <span className="cw-ci-tick" aria-hidden="true"><Check /></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
