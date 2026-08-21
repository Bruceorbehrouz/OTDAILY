# Article Pipeline

Daily articles are served as static JSON files from `public/articles/`, one file
per day, named `YYYY-MM-DD.json`. The app uses Vancouver time
(America/Vancouver) to decide which one is today's.

There are two ways to publish:

- **The queue** — drop a batch of undated articles into `content/queue/` and
  each one is automatically assigned its own date. Best for building up a
  backlog.
- **By hand** — write `public/articles/YYYY-MM-DD.json` yourself. Best for
  publishing something on a specific day.

The two mix freely: the queue always skips dates that already have an article.

## The queue

Drop as many article JSON files as you like into `content/queue/`. Filenames
don't matter, except that they decide the order (`01-…`, `02-…` sorts the way
you'd expect). Then:

```bash
npm run articles:plan       # show which date each queued article would get
npm run articles:schedule   # assign the dates for real
```

`articles:schedule` gives each queued article the next free date — starting with
today and skipping any date that already has an article — writes it to
`public/articles/<date>.json`, and removes it from the queue. Commit the result
and the schedule is locked in.

Given a queue of three articles run on a Monday with nothing else published:

```
  2026-08-24  ←  content/queue/01-fatigue-management.json
  2026-08-25  ←  content/queue/02-home-modifications.json
  2026-08-26  ←  content/queue/03-sensory-processing.json
```

### Pinning a date

Add `"publishOn": "YYYY-MM-DD"` to a queued article to hold it for a specific
day. Pinned dates are claimed before the rest of the queue is dated, and the
field is stripped from the published file. Pinning a date that already has a
different article is an error.

### The build safety net

`npm run build` runs the scheduler in a non-destructive mode first: anything
still sitting in the queue gets dated for that build only, so a forgotten
`articles:schedule` never leaves the site without an article. The queue files
are left alone and the build prints a reminder.

Dates assigned this way are recomputed on every build, so an article can shift
to a later date if the next deploy happens on a later day. Run
`npm run articles:schedule` and commit to make them permanent.

### Duplicate protection

An article is recognised by its `pmid`, or its `doi`, or its title. If a queued
article has already been published under some date, it is skipped rather than
published a second time, so re-running the scheduler is always safe.

## Missed days

If today has no article, the app falls back to the most recent earlier one and
shows a note saying so, instead of an empty page. This relies on
`public/articles/index.json`, which the scheduler regenerates on every run —
don't edit it by hand.

## JSON format

```json
{
  "pmid": "optional-pubmed-id",
  "title": "Full article title",
  "authors": "Smith JA, Jones RK et al.",
  "journal": "Journal Name",
  "year": "2024",
  "doi": "10.1000/xyz123",
  "doiUrl": "https://doi.org/10.1000/xyz123",
  "studyType": "Systematic Review",
  "summary": "Plain-language summary of the article.",
  "forPatients": "Patient-friendly explanation of the findings.",
  "forPhysio": "Clinical implications and application for practitioners.",
  "keyFindings": [
    "Finding 1",
    "Finding 2",
    "Finding 3"
  ]
}
```

### Required fields
`title`, `authors`, `journal`, `year`, `summary`, `forPatients`, `forPhysio`,
`keyFindings`

### Optional fields
`pmid`, `doi`, `doiUrl`, `studyType`, and `publishOn` (queue only)

The scheduler validates every queued file and fails with a list of what's
missing, so a malformed article can't reach the site.

Articles are cached in localStorage for the day, so readers don't re-fetch the
same one.

## Adding new Physle words

Edit `src/data/words.ts`:
- Add the word to `PHYSLE_WORDS` array
- Add its definition to `WORD_DEFS` object

Words must be exactly 5 letters. The daily word rotates deterministically
using `(dayOfYear() + PHYSLE_WORD_OFFSET) % PHYSLE_WORDS.length`.
Changing the order of existing words will alter the rotation schedule.
Safe to append new words to the end of the array.

## Adding a new weekly crossword

Replace `public/crossword.json` with a new puzzle in this format:

```json
{
  "rows": 16,
  "cols": 17,
  "result": [
    {
      "answer": "FEMUR",
      "clue": "The longest bone in the body.",
      "startx": 1,
      "starty": 1,
      "orientation": "across",
      "position": 1
    }
  ]
}
```

`startx`/`starty` are 1-based. Across and Down clues may share a number — the
app tells them apart by number *and* orientation.

Puzzle progress is saved per week. A new `crossword.json` file automatically
becomes the active puzzle. Previous weeks' progress is preserved in localStorage
under the old week key.
