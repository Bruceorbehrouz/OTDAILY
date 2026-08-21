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

Copy `.env.example` to `.env` for local overrides.

```bash
VITE_ENABLE_WORDLE=false
VITE_ENABLE_CROSSWORD=true
VITE_ENABLE_SAVED=false
VITE_ENABLE_TEXT_TO_SPEECH=false
```

- `VITE_ENABLE_WORDLE`: shows or hides the word game.
- `VITE_ENABLE_CROSSWORD`: shows or hides the crossword.
- `VITE_ENABLE_SAVED`: shows or hides saved article controls.
- `VITE_ENABLE_TEXT_TO_SPEECH`: shows or hides article read-aloud controls.
