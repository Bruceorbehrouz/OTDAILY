export interface Article {
  pmid?: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi?: string;
  doiUrl?: string;
  studyType?: string;
  summary: string;
  forPatients: string;
  forPhysio: string;
  keyFindings: string[];
}

export interface DailyArticles {
  [categoryId: string]: Article;
}

export interface Category {
  id: string;
  label: string;
  full: string;
  color: string;
  mid: string;
  tag: string;
  tagText: string;
}

export interface Bookmark {
  article: Article;
  categoryId: string;
  savedAt: string;
}

export interface BookmarkStore {
  [key: string]: Bookmark;
}

export type AppView = 'research' | 'physle' | 'crossword' | 'saved' | 'about';

// Physle
export interface PhysleState {
  guesses: string[];
  current: string;
  done: boolean;
  won: boolean;
}

export interface PhysleStreak {
  count: number;
  lastDate: string;
  best: number;
}

export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export interface LetterResult {
  letter: string;
  status: LetterStatus;
}

// Crossword
export interface CrosswordClue {
  answer: string;
  clue: string;
  startx: number;
  starty: number;
  orientation: 'across' | 'down';
  position: number;
}

export interface CrosswordData {
  rows: number;
  cols: number;
  result: CrosswordClue[];
}

export interface CrosswordProgress {
  userLetters: { [key: string]: string };
  solvedClues: number[];
  completedAt?: string;
}
