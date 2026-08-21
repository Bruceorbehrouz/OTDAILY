#!/usr/bin/env node
/**
 * Assigns a unique publication date to every article waiting in content/queue/.
 *
 * Drop as many article JSON files into content/queue/ as you like. Each one is
 * handed the next free date — starting with today (Vancouver) and skipping any
 * date that already has an article — and written to public/articles/<date>.json.
 * That way a backlog of articles keeps the site fed even on days when nobody
 * publishes a fresh one.
 *
 * Modes:
 *   --build     write dated files but leave the queue alone (used by npm build)
 *   --consume   also delete the queue files, so the result can be committed
 *   --dry-run   print the schedule and change nothing
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_DIR = join(ROOT, 'content', 'queue');
const ARTICLES_DIR = join(ROOT, 'public', 'articles');
const INDEX_FILE = join(ARTICLES_DIR, 'index.json');
const TZ = 'America/Vancouver';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED = ['title', 'authors', 'journal', 'year', 'summary', 'forPatients', 'forPhysio', 'keyFindings'];
/** Fields the app never reads — stripped before the article is published. */
const QUEUE_ONLY = ['publishOn'];

const args = new Set(process.argv.slice(2));
const consume = args.has('--consume');
const dryRun = args.has('--dry-run');
const quiet = args.has('--quiet');

const log = (...m) => { if (!quiet) console.log(...m); };

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Everything an article can be recognised by, so nothing gets published twice. */
function identity(article) {
  if (article.pmid) return `pmid:${String(article.pmid).trim()}`;
  if (article.doi) return `doi:${String(article.doi).trim().toLowerCase()}`;
  return `title:${String(article.title ?? '').trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

function validate(article, source) {
  const problems = [];
  for (const field of REQUIRED) {
    const value = article[field];
    if (value === undefined || value === null || value === '') problems.push(`missing "${field}"`);
  }
  if (article.keyFindings !== undefined && !Array.isArray(article.keyFindings)) {
    problems.push('"keyFindings" must be an array of strings');
  } else if (Array.isArray(article.keyFindings) && article.keyFindings.length === 0) {
    problems.push('"keyFindings" is empty');
  }
  if (article.publishOn !== undefined && !DATE_RE.test(article.publishOn)) {
    problems.push('"publishOn" must be YYYY-MM-DD');
  }
  if (problems.length) {
    throw new Error(`${source} is not a valid article:\n    - ${problems.join('\n    - ')}`);
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${basename(file)} is not valid JSON: ${err.message}`);
  }
}

function publishedDates() {
  if (!existsSync(ARTICLES_DIR)) return [];
  return readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.json') && DATE_RE.test(f.slice(0, -5)))
    .map(f => f.slice(0, -5))
    .sort();
}

function queueFiles() {
  if (!existsSync(QUEUE_DIR)) return [];
  // Filename order decides queue order, so a numeric prefix (01-, 02-) pins it.
  return readdirSync(QUEUE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

function writeIndex(dates) {
  const articles = dates.map(date => {
    const { title, studyType } = readJson(join(ARTICLES_DIR, `${date}.json`));
    return studyType ? { date, title, studyType } : { date, title };
  });
  writeFileSync(INDEX_FILE, `${JSON.stringify({ generated: new Date().toISOString(), articles }, null, 2)}\n`);
}

function main() {
  mkdirSync(ARTICLES_DIR, { recursive: true });

  const today = todayStr();
  const taken = new Set(publishedDates());
  const published = new Map();
  for (const date of taken) {
    published.set(identity(readJson(join(ARTICLES_DIR, `${date}.json`))), date);
  }

  const queued = queueFiles();
  const scheduled = [];
  const duplicates = [];

  const entries = queued.map(name => ({ name, article: readJson(join(QUEUE_DIR, name)) }));
  for (const entry of entries) validate(entry.article, `content/queue/${entry.name}`);

  // Anything already out stays where it is, so re-running never double-books.
  const pending = [];
  for (const entry of entries) {
    const id = identity(entry.article);
    if (published.has(id)) duplicates.push({ ...entry, date: published.get(id) });
    else pending.push(entry);
  }

  // Pinned dates are claimed first so an earlier file cannot take them.
  for (const entry of pending) {
    const pin = entry.article.publishOn;
    if (!pin) continue;
    if (taken.has(pin)) {
      throw new Error(
        `content/queue/${entry.name} pins publishOn ${pin}, but a different article ` +
        'already occupies that date.'
      );
    }
    entry.date = pin;
    taken.add(pin);
  }

  let cursor = today;
  for (const entry of pending) {
    if (!entry.date) {
      while (taken.has(cursor)) cursor = addDays(cursor, 1);
      entry.date = cursor;
      taken.add(cursor);
    }
    published.set(identity(entry.article), entry.date);
    scheduled.push(entry);
  }

  scheduled.sort((a, b) => a.date.localeCompare(b.date));

  if (!scheduled.length && !duplicates.length) {
    log('No queued articles. Nothing to schedule.');
  }

  for (const { name, date } of scheduled) log(`  ${date}  ←  content/queue/${name}`);
  for (const { name, date } of duplicates) {
    log(`  skipped  content/queue/${name} — already published as ${date}.json`);
  }

  if (dryRun) {
    log('\nDry run — no files written.');
    return;
  }

  for (const { name, article, date } of scheduled) {
    const output = { ...article };
    for (const field of QUEUE_ONLY) delete output[field];
    writeFileSync(join(ARTICLES_DIR, `${date}.json`), `${JSON.stringify(output, null, 2)}\n`);
    if (consume) rmSync(join(QUEUE_DIR, name));
  }
  if (consume) for (const { name } of duplicates) rmSync(join(QUEUE_DIR, name));

  writeIndex(publishedDates());

  if (scheduled.length) {
    log(`\nScheduled ${scheduled.length} article${scheduled.length === 1 ? '' : 's'} through ${scheduled.at(-1).date}.`);
    if (!consume) {
      log(
        'These were scheduled for this build only. Run "npm run articles:schedule" and\n' +
        'commit public/articles/ to lock the dates in.'
      );
    }
  }
  log(`Article index written with ${publishedDates().length} entries.`);
}

try {
  main();
} catch (err) {
  console.error(`\nArticle scheduling failed: ${err.message}\n`);
  process.exit(1);
}
