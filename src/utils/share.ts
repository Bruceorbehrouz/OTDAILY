import type { LetterResult } from '../types';

export function sharePhysle(guesses: LetterResult[][], won: boolean, streak: number): void {
  const lines = guesses.map(row =>
    row.map(({ status }) =>
      status === 'correct' ? 'G' :
      status === 'present' ? 'Y' : '-'
    ).join('')
  ).join('\n');

  const result = won ? `${guesses.length}/6` : 'X/6';
  const text = `Wordle ${result} | Streak ${streak}\n\n${lines}\n\nPlay at OT Research Daily`;

  if (navigator.share) {
    navigator.share({ text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

export function shareCrossword(clueCount: number, weekKey: string): void {
  const text = `OT Research Daily Crossword | Week ${weekKey}\n${clueCount} clues solved\n\nPlay at OT Research Daily`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => copyToClipboard(text));
  } else {
    copyToClipboard(text);
  }
}

export function copyArticle(article: { title: string; authors: string; journal: string; year: string; doiUrl?: string; summary: string }): void {
  const text = [
    `**${article.title}**`,
    `${article.authors}`,
    `_${article.journal}_, ${article.year}`,
    article.doiUrl ? article.doiUrl : '',
    '',
    article.summary,
  ].filter(Boolean).join('\n');
  copyToClipboard(text);
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}
