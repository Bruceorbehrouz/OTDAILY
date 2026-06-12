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
