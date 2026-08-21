#!/usr/bin/env node
/**
 * Checks that every rotating content source is intact, so nothing the site
 * serves can quietly run dry or fall out of sync.
 *
 * Run by prebuild, so a broken word list or an empty puzzle library fails the
 * build rather than reaching readers.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

function fail(msg) { problems.push(msg); }

// -------------------------------------------------------- daily word rotation

function checkWords() {
  const src = readFileSync(join(ROOT, 'src', 'data', 'words.ts'), 'utf8');

  const listMatch = src.match(/PHYSLE_WORDS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!listMatch) return fail('words.ts: could not find PHYSLE_WORDS');
  const words = (listMatch[1].match(/'[A-Z]+'/g) ?? []).map(s => s.slice(1, -1));
  const defs = new Set([...src.matchAll(/^ {2}([A-Z]{5}):/gm)].map(m => m[1]));

  if (words.length < 30) fail(`words.ts: only ${words.length} words in the rotation`);

  const wrongLength = words.filter(w => w.length !== 5);
  if (wrongLength.length) fail(`words.ts: not five letters — ${wrongLength.join(', ')}`);

  const duplicates = words.filter((w, i) => words.indexOf(w) !== i);
  if (duplicates.length) fail(`words.ts: duplicated in the rotation — ${[...new Set(duplicates)].join(', ')}`);

  const undefined_ = words.filter(w => !defs.has(w));
  if (undefined_.length) fail(`words.ts: no definition for — ${undefined_.join(', ')}`);

  const orphans = [...defs].filter(d => !words.includes(d));
  if (orphans.length) fail(`words.ts: defined but never used — ${orphans.join(', ')}`);

  notes.push(`Daily word: ${words.length} words, ${words.length} definitions — ${words.length} days before a repeat.`);
}

// ----------------------------------------------------------- weekly crossword

function checkCrosswords() {
  const dir = join(ROOT, 'public', 'crosswords');
  const indexFile = join(dir, 'index.json');
  if (!existsSync(indexFile)) {
    return fail('public/crosswords/index.json is missing — run npm run crosswords:build');
  }

  const index = JSON.parse(readFileSync(indexFile, 'utf8'));
  if (!index.puzzles?.length) return fail('crossword library is empty');

  for (const { id } of index.puzzles) {
    if (!existsSync(join(dir, `${id}.json`))) fail(`crossword library lists ${id} but the file is missing`);
  }

  const onDisk = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').length;
  if (onDisk !== index.puzzles.length) {
    fail(`crossword library has ${onDisk} puzzle files but the index lists ${index.puzzles.length}`);
  }

  if (!existsSync(join(ROOT, 'public', 'crossword.json'))) {
    fail('public/crossword.json is missing — it is the fallback if the library cannot be reached');
  }

  notes.push(`Weekly crossword: ${index.puzzles.length} puzzles — ${index.puzzles.length} weeks before a repeat.`);
}

// ------------------------------------------------------------- daily articles

function checkArticles() {
  const dir = join(ROOT, 'public', 'articles');
  const dated = existsSync(dir)
    ? readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    : [];

  if (!dated.length) {
    return fail('no articles in public/articles — the research view would have nothing to fall back to');
  }

  if (!existsSync(join(dir, 'index.json'))) {
    fail('public/articles/index.json is missing — the missed-day fallback needs it');
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
  const ahead = dated.map(f => f.slice(0, -5)).filter(d => d >= today).sort();
  const queued = existsSync(join(ROOT, 'content', 'queue'))
    ? readdirSync(join(ROOT, 'content', 'queue')).filter(f => f.endsWith('.json')).length
    : 0;

  notes.push(
    `Articles: ${dated.length} published, ${ahead.length} dated today or later` +
    `${queued ? `, ${queued} waiting in the queue` : ''}.`
  );
  if (!ahead.length) {
    notes.push('  ↳ Nothing scheduled from today on. Readers see the most recent article until you add more.');
  }
}

checkWords();
checkCrosswords();
checkArticles();

for (const note of notes) console.log(note);

if (problems.length) {
  console.error(`\nContent check failed:\n    - ${problems.join('\n    - ')}\n`);
  process.exit(1);
}
console.log('Content check passed.');
