import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { PHYSLE_WORDS, PHYSLE_WORD_OFFSET } from '../data/words';
import { dayOfYear, vancouverDateStr, weekDays } from '../utils/date';
import type { PhysleState, PhysleStreak, LetterResult, LetterStatus } from '../types';

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

function getDailyWord(): string {
  return PHYSLE_WORDS[(dayOfYear() + PHYSLE_WORD_OFFSET) % PHYSLE_WORDS.length];
}

function stateKey(): string {
  return `physle_v2_${vancouverDateStr()}`;
}

function getInitialState(): PhysleState {
  return { guesses: [], current: '', done: false, won: false };
}

export function evaluateGuess(guess: string, target: string): LetterResult[] {
  const result: LetterResult[] = Array(WORD_LENGTH).fill(null).map((_, i) => ({
    letter: guess[i],
    status: 'absent' as LetterStatus,
  }));

  const targetArr = target.split('');
  const used = new Array(WORD_LENGTH).fill(false);

  // First pass: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
      result[i].status = 'correct';
      used[i] = true;
    }
  }

  // Second pass: present but wrong position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i].status === 'correct') continue;
    const j = targetArr.findIndex((c, idx) => c === guess[i] && !used[idx]);
    if (j !== -1) {
      result[i].status = 'present';
      used[j] = true;
    }
  }

  return result;
}

export function usePhysle() {
  const word = getDailyWord();
  const today = vancouverDateStr();

  const [state, setState] = useLocalStorage<PhysleState>(stateKey(), getInitialState());
  const [streak, setStreak] = useLocalStorage<PhysleStreak>('physle_streak_v1', { count: 0, lastDate: '', best: 0 });
  const [shake, setShake] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Update streak when solved
  useEffect(() => {
    if (!state.done) return;
    if (streak.lastDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yday = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });

    const newCount = state.won ? (streak.lastDate === yday ? streak.count + 1 : 1) : 0;
    setStreak({
      count: newCount,
      lastDate: today,
      best: Math.max(streak.best, newCount),
    });
  }, [setStreak, state.done, state.won, streak.best, streak.count, streak.lastDate, today]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const addLetter = useCallback((letter: string) => {
    setState(prev => {
      if (prev.done || prev.current.length >= WORD_LENGTH) return prev;
      return { ...prev, current: prev.current + letter };
    });
  }, [setState]);

  const deleteLetter = useCallback(() => {
    setState(prev => {
      if (prev.done) return prev;
      return { ...prev, current: prev.current.slice(0, -1) };
    });
  }, [setState]);

  const submitGuess = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.done) return;
    if (currentState.current.length < WORD_LENGTH) {
      setShake(true);
      showToast('Not enough letters');
      setTimeout(() => setShake(false), 600);
      return;
    }

    const guess = currentState.current.toUpperCase();

    setReveal(true);
    setTimeout(() => setReveal(false), 1600);

    const won = guess === word;
    const newGuesses = [...currentState.guesses, guess];
    const done = won || newGuesses.length >= MAX_GUESSES;

    setState(prev => ({ ...prev, guesses: newGuesses, current: '', done, won }));

    if (won) {
      setTimeout(() => showToast('Brilliant!'), 1600);
    } else if (done) {
      setTimeout(() => showToast(word), 2000);
    }
  }, [word, setState, showToast]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Enter') submitGuess();
      else if (e.key === 'Backspace') deleteLetter();
      else if (/^[a-zA-Z]$/.test(e.key)) addLetter(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addLetter, deleteLetter, submitGuess]);

  // Build grid of evaluated rows
  const grid: LetterResult[][] = state.guesses.map(g => evaluateGuess(g, word));

  // Add current row
  if (!state.done && state.guesses.length < MAX_GUESSES) {
    const row: LetterResult[] = Array(WORD_LENGTH).fill(null).map((_, i) => ({
      letter: state.current[i] ?? '',
      status: 'tbd' as LetterStatus,
    }));
    grid.push(row);
  }

  // Pad remaining empty rows
  while (grid.length < MAX_GUESSES) {
    grid.push(Array(WORD_LENGTH).fill({ letter: '', status: 'empty' as LetterStatus }));
  }

  // Letter statuses for keyboard
  const letterStatuses: Record<string, LetterStatus> = {};
  for (const guess of state.guesses) {
    evaluateGuess(guess, word).forEach(({ letter, status }) => {
      const cur = letterStatuses[letter];
      if (cur === 'correct') return;
      if (cur === 'present' && status !== 'correct') return;
      letterStatuses[letter] = status;
    });
  }

  const calendar = weekDays().map(({ label, date }) => ({
    label,
    date,
    isToday: date === today,
    solved: date === today ? state.won : false,
  }));

  return {
    word,
    state,
    grid,
    letterStatuses,
    streak,
    shake,
    reveal,
    toast,
    calendar,
    currentRowIndex: state.guesses.length,
    addLetter,
    deleteLetter,
    submitGuess,
  };
}
