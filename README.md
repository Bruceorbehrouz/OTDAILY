# OT Research Daily

OT Research Daily is a Vite + React app for publishing accessible occupational therapy research summaries, with optional interactive features.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Content

Three rotating surfaces keep the site stocked:

| Surface | Rotation | Runway | Needs you? |
| --- | --- | --- | --- |
| Daily word game | New word each day | 198 words | Only to add more |
| Weekly crossword | New puzzle each week, from a generated library | 52 puzzles | Only to add more |
| Daily article | New article each day, from the queue | Your backlog | Yes |

```bash
npm run content:check    # runway report; also runs as part of every build
```

Nothing can go blank: if a day has no article the app shows the closest one it
has, and both games rotate through their libraries indefinitely. See
[ARTICLES.md](ARTICLES.md) for how to add words, clues and articles.

## Publishing articles

Drop article JSON files into `content/queue/` and each one is assigned its own
publication date, so a backlog keeps the site fed on days when nobody publishes
something fresh:

```bash
npm run articles:plan       # preview the dates
npm run articles:schedule   # assign them, then commit public/articles/
```

`npm run build` also dates anything left in the queue as a safety net. If a day
still ends up with no article, the app shows the most recent earlier one rather
than an empty page. See [ARTICLES.md](ARTICLES.md) for the full workflow.

## Deployment

The app deploys to GitHub Pages through `.github/workflows/pages.yml` when changes land on `main`.

## Feature Flags

Every feature is **on by default**, in local builds and in production alike.
Set a flag to `false` to switch one off for a build — in `.env` locally, or in
the `Build` step of `.github/workflows/pages.yml` for the live site.

- `VITE_ENABLE_WORDLE`: the daily word game.
- `VITE_ENABLE_CROSSWORD`: the weekly crossword.
- `VITE_ENABLE_SAVED`: saved article controls.
- `VITE_ENABLE_TEXT_TO_SPEECH`: article read-aloud controls.
