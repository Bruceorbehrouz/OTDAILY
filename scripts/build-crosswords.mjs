#!/usr/bin/env node
/**
 * Builds the weekly crossword library from content/crossword-bank.json.
 *
 * Generation is seeded by puzzle index, so rebuilding produces byte-identical
 * puzzles: adding entries to the bank never reshuffles the puzzles already
 * published, and readers never lose progress to a rebuild.
 *
 * Every puzzle is checked against the same rules a hand-built crossword must
 * satisfy before it is written — see validate() — so a malformed grid fails
 * the build instead of reaching the site.
 *
 *   node scripts/build-crosswords.mjs [--count N] [--check]
 *
 *   --count N   how many puzzles to build (default 52, one per week)
 *   --check     validate the committed library without rewriting it
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BANK_FILE = join(ROOT, 'content', 'crossword-bank.json');
const OUT_DIR = join(ROOT, 'public', 'crosswords');
const INDEX_FILE = join(OUT_DIR, 'index.json');
const LEGACY_FILE = join(ROOT, 'public', 'crossword.json');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const countArg = args.indexOf('--count');
const PUZZLE_COUNT = countArg !== -1 ? Number(args[countArg + 1]) : 52;

/** Words offered to each puzzle; more candidates means a denser grid. */
const CANDIDATES_PER_PUZZLE = 70;
/** A puzzle with fewer entries than this is rejected and reseeded. */
const MIN_ENTRIES = 26;
const MAX_ENTRIES = 34;
const MAX_SIDE = 18;

// ---------------------------------------------------------------- utilities

/** Small deterministic PRNG, so a given seed always builds the same puzzle. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const key = (r, c) => `${r},${c}`;

// --------------------------------------------------------------- generation

function cellsOf(word, r, c, orientation) {
  return Array.from({ length: word.length }, (_, i) => ({
    r: orientation === 'across' ? r : r + i,
    c: orientation === 'across' ? c + i : c,
    letter: word[i],
  }));
}

/**
 * A placement is legal only if the new word touches the grid exactly at its
 * crossings: every other cell of it, and the squares on either side of it,
 * must be empty. That is what stops two parallel words from running together
 * into a nonsense entry.
 */
function placementCrossings(grid, word, r, c, orientation) {
  const cells = cellsOf(word, r, c, orientation);
  let crossings = 0;

  const beforeR = orientation === 'across' ? r : r - 1;
  const beforeC = orientation === 'across' ? c - 1 : c;
  const last = cells[cells.length - 1];
  const afterR = orientation === 'across' ? r : last.r + 1;
  const afterC = orientation === 'across' ? last.c + 1 : c;
  if (grid.has(key(beforeR, beforeC)) || grid.has(key(afterR, afterC))) return null;

  for (const cell of cells) {
    const existing = grid.get(key(cell.r, cell.c));
    if (existing) {
      if (existing.letter !== cell.letter) return null;
      // Each square may host at most one across and one down entry.
      if (existing.orientations.has(orientation)) return null;
      crossings++;
      continue;
    }
    // Empty square: its perpendicular neighbours must be empty too.
    const sides = orientation === 'across'
      ? [[cell.r - 1, cell.c], [cell.r + 1, cell.c]]
      : [[cell.r, cell.c - 1], [cell.r, cell.c + 1]];
    for (const [sr, sc] of sides) if (grid.has(key(sr, sc))) return null;
  }

  return crossings;
}

function place(grid, word, r, c, orientation) {
  for (const cell of cellsOf(word, r, c, orientation)) {
    const existing = grid.get(key(cell.r, cell.c));
    if (existing) existing.orientations.add(orientation);
    else grid.set(key(cell.r, cell.c), { letter: cell.letter, orientations: new Set([orientation]) });
  }
}

function bounds(placements) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const p of placements) {
    for (const cell of cellsOf(p.answer, p.r, p.c, p.orientation)) {
      minR = Math.min(minR, cell.r); maxR = Math.max(maxR, cell.r);
      minC = Math.min(minC, cell.c); maxC = Math.max(maxC, cell.c);
    }
  }
  return { minR, maxR, minC, maxC, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

function generate(candidates, seed) {
  const rand = mulberry32(seed);
  const pool = shuffled(candidates, rand)
    .slice(0, CANDIDATES_PER_PUZZLE)
    .sort((a, b) => b.answer.length - a.answer.length || a.answer.localeCompare(b.answer));

  const grid = new Map();
  const placements = [];

  const seedWord = pool.shift();
  place(grid, seedWord.answer, 0, 0, 'across');
  placements.push({ ...seedWord, r: 0, c: 0, orientation: 'across' });

  let progress = true;
  while (progress && placements.length < MAX_ENTRIES) {
    progress = false;

    for (let i = 0; i < pool.length && placements.length < MAX_ENTRIES; i++) {
      const entry = pool[i];
      const options = [];

      for (const placed of placements) {
        const placedCells = cellsOf(placed.answer, placed.r, placed.c, placed.orientation);
        const orientation = placed.orientation === 'across' ? 'down' : 'across';

        for (const anchor of placedCells) {
          for (let k = 0; k < entry.answer.length; k++) {
            if (entry.answer[k] !== anchor.letter) continue;
            const r = orientation === 'across' ? anchor.r : anchor.r - k;
            const c = orientation === 'across' ? anchor.c - k : anchor.c;

            const crossings = placementCrossings(grid, entry.answer, r, c, orientation);
            if (!crossings) continue;

            const box = bounds([...placements, { ...entry, r, c, orientation }]);
            if (box.rows > MAX_SIDE || box.cols > MAX_SIDE) continue;

            options.push({
              r, c, orientation, crossings,
              // Prefer well-crossed words in a compact, roughly square grid.
              score: crossings * 100 - (box.rows + box.cols) - Math.abs(box.rows - box.cols),
            });
          }
        }
      }

      if (!options.length) continue;
      options.sort((a, b) =>
        b.score - a.score || a.r - b.r || a.c - b.c || a.orientation.localeCompare(b.orientation));
      const best = options[0];
      place(grid, entry.answer, best.r, best.c, best.orientation);
      placements.push({ ...entry, r: best.r, c: best.c, orientation: best.orientation });
      pool.splice(i, 1);
      i--;
      progress = true;
    }
  }

  return placements;
}

/** Standard crossword numbering: scan top-left to bottom-right. */
function numberPuzzle(placements) {
  const box = bounds(placements);
  const normalised = placements.map(p => ({
    answer: p.answer,
    clue: p.clue,
    starty: p.r - box.minR + 1,
    startx: p.c - box.minC + 1,
    orientation: p.orientation,
  }));

  const starts = new Map();
  for (const p of normalised) starts.set(key(p.starty, p.startx), 0);

  let n = 0;
  for (let r = 1; r <= box.rows; r++) {
    for (let c = 1; c <= box.cols; c++) {
      if (starts.has(key(r, c))) starts.set(key(r, c), ++n);
    }
  }

  const result = normalised
    .map(p => ({ ...p, position: starts.get(key(p.starty, p.startx)) }))
    .sort((a, b) => a.position - b.position || a.orientation.localeCompare(b.orientation));

  return { rows: box.rows, cols: box.cols, result };
}

// --------------------------------------------------------------- validation

/** Everything that must hold before a puzzle is fit to publish. */
function validate(puzzle, label) {
  const problems = [];
  const letters = new Map();
  const entries = new Set();

  for (const clue of puzzle.result) {
    if (!/^[A-Z]+$/.test(clue.answer)) problems.push(`${clue.answer}: answer must be A-Z only`);
    if (!clue.clue?.trim()) problems.push(`${clue.answer}: missing clue`);
    if (clue.orientation !== 'across' && clue.orientation !== 'down') {
      problems.push(`${clue.answer}: bad orientation`);
      continue;
    }
    entries.add(`${clue.orientation}:${clue.starty}:${clue.startx}:${clue.answer.length}`);

    for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.orientation === 'across' ? clue.starty : clue.starty + i;
      const c = clue.orientation === 'across' ? clue.startx + i : clue.startx;
      if (r < 1 || r > puzzle.rows || c < 1 || c > puzzle.cols) {
        problems.push(`${clue.answer}: runs outside the ${puzzle.rows}x${puzzle.cols} grid`);
        break;
      }
      const existing = letters.get(key(r, c));
      if (existing && existing !== clue.answer[i]) {
        problems.push(`${clue.answer}: letter clash at row ${r} column ${c} (${existing} vs ${clue.answer[i]})`);
      }
      letters.set(key(r, c), clue.answer[i]);
    }
  }

  // Every run of two or more adjacent squares must be a declared entry.
  for (let r = 1; r <= puzzle.rows; r++) {
    let run = [];
    for (let c = 1; c <= puzzle.cols + 1; c++) {
      if (letters.has(key(r, c))) { run.push(c); continue; }
      if (run.length > 1 && !entries.has(`across:${r}:${run[0]}:${run.length}`)) {
        problems.push(`undeclared across run at row ${r}, columns ${run[0]}-${run.at(-1)}`);
      }
      run = [];
    }
  }
  for (let c = 1; c <= puzzle.cols; c++) {
    let run = [];
    for (let r = 1; r <= puzzle.rows + 1; r++) {
      if (letters.has(key(r, c))) { run.push(r); continue; }
      if (run.length > 1 && !entries.has(`down:${run[0]}:${c}:${run.length}`)) {
        problems.push(`undeclared down run at column ${c}, rows ${run[0]}-${run.at(-1)}`);
      }
      run = [];
    }
  }

  // Numbering must be the standard scan order, and shared between an
  // across/down pair that starts on the same square.
  const startCells = [...new Set(puzzle.result.map(p => key(p.starty, p.startx)))]
    .map(k => k.split(',').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const expected = new Map(startCells.map(([r, c], i) => [key(r, c), i + 1]));
  for (const clue of puzzle.result) {
    const want = expected.get(key(clue.starty, clue.startx));
    if (clue.position !== want) {
      problems.push(`${clue.answer}: numbered ${clue.position}, expected ${want}`);
    }
  }

  const duplicateAnswers = puzzle.result
    .map(p => p.answer)
    .filter((a, i, all) => all.indexOf(a) !== i);
  if (duplicateAnswers.length) problems.push(`answer repeated in one puzzle: ${duplicateAnswers.join(', ')}`);

  if (puzzle.result.length < MIN_ENTRIES) {
    problems.push(`only ${puzzle.result.length} entries, minimum is ${MIN_ENTRIES}`);
  }

  // Only the seed word may stand alone; everything else must interlock.
  for (const clue of puzzle.result) {
    let crossings = 0;
    for (let i = 0; i < clue.answer.length; i++) {
      const r = clue.orientation === 'across' ? clue.starty : clue.starty + i;
      const c = clue.orientation === 'across' ? clue.startx + i : clue.startx;
      const crossed = puzzle.result.some(other =>
        other !== clue && other.orientation !== clue.orientation &&
        (other.orientation === 'across'
          ? other.starty === r && c >= other.startx && c < other.startx + other.answer.length
          : other.startx === c && r >= other.starty && r < other.starty + other.answer.length));
      if (crossed) crossings++;
    }
    if (crossings === 0) problems.push(`${clue.answer}: does not cross any other word`);
  }

  if (problems.length) {
    throw new Error(`${label} is not a valid crossword:\n    - ${problems.join('\n    - ')}`);
  }
  return { cells: letters.size };
}

// --------------------------------------------------------------------- main

function buildLibrary(bank) {
  const puzzles = [];

  for (let i = 0; i < PUZZLE_COUNT; i++) {
    let built = null;
    // Reseed until the grid comes out big enough; the attempt index keeps it
    // deterministic.
    for (let attempt = 0; attempt < 40 && !built; attempt++) {
      const placements = generate(bank.entries, i * 1000 + attempt);
      if (placements.length < MIN_ENTRIES) continue;
      const puzzle = numberPuzzle(placements);
      try {
        validate(puzzle, `puzzle ${i + 1}`);
        built = puzzle;
      } catch {
        // A rejected grid just means this seed produced an unusable layout.
      }
    }
    if (!built) throw new Error(`could not build puzzle ${i + 1} after 40 attempts`);
    puzzles.push(built);
  }

  return puzzles;
}

function checkLibrary() {
  if (!existsSync(INDEX_FILE)) throw new Error('no crossword library found — run npm run crosswords:build');
  const index = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
  let cells = 0;
  for (const { id } of index.puzzles) {
    const file = join(OUT_DIR, `${id}.json`);
    if (!existsSync(file)) throw new Error(`index lists ${id} but ${id}.json is missing`);
    cells += validate(JSON.parse(readFileSync(file, 'utf8')), id).cells;
  }
  console.log(`Checked ${index.puzzles.length} puzzles — all valid (${cells} squares total).`);
}

function main() {
  if (checkOnly) return checkLibrary();

  const bank = JSON.parse(readFileSync(BANK_FILE, 'utf8'));
  if (!Array.isArray(bank.entries) || bank.entries.length < 60) {
    throw new Error('crossword bank needs at least 60 entries');
  }
  for (const entry of bank.entries) {
    if (!/^[A-Z]{3,14}$/.test(entry.answer)) throw new Error(`bad bank answer: ${entry.answer}`);
    if (!entry.clue?.trim()) throw new Error(`bank entry ${entry.answer} has no clue`);
  }

  const puzzles = buildLibrary(bank);
  mkdirSync(OUT_DIR, { recursive: true });

  // Drop puzzles left over from a previous, longer run so the folder always
  // matches the index.
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith('.json')) rmSync(join(OUT_DIR, file));
  }

  const listed = [];
  puzzles.forEach((puzzle, i) => {
    const id = `puzzle-${String(i + 1).padStart(2, '0')}`;
    writeFileSync(join(OUT_DIR, `${id}.json`), `${JSON.stringify(puzzle, null, 2)}\n`);
    listed.push({ id, clues: puzzle.result.length, rows: puzzle.rows, cols: puzzle.cols });
  });

  writeFileSync(INDEX_FILE, `${JSON.stringify({
    generated: new Date().toISOString(),
    note: 'Generated by scripts/build-crosswords.mjs from content/crossword-bank.json. Do not edit by hand.',
    puzzles: listed,
  }, null, 2)}\n`);

  // Keep the original single-file path working for anyone with it cached.
  writeFileSync(LEGACY_FILE, `${JSON.stringify(puzzles[0], null, 2)}\n`);

  const avg = (listed.reduce((s, p) => s + p.clues, 0) / listed.length).toFixed(1);
  console.log(`Built ${listed.length} puzzles (${avg} clues each on average) into public/crosswords/.`);
}

try {
  main();
} catch (err) {
  console.error(`\nCrossword build failed: ${err.message}\n`);
  process.exit(1);
}
