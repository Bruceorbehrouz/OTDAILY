# Article Pipeline

Daily articles are served as static JSON files from `public/articles/`.

## File naming

One file per day: `public/articles/YYYY-MM-DD.json`

The app uses Vancouver time (America/Vancouver) to determine today's date.
Example: `public/articles/2026-06-11.json`

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

## Required fields
- `title`, `authors`, `journal`, `year`, `summary`, `forPatients`, `forPhysio`, `keyFindings`

## Optional fields
- `pmid`, `doi`, `doiUrl`, `studyType`

## Pipeline workflow

1. Select or generate today's article
2. Create `public/articles/YYYY-MM-DD.json` with the above format
3. Deploy — the app fetches it automatically and caches it for the day
4. Articles are cached in localStorage so users don't re-fetch the same day

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

Puzzle progress is saved per week. A new `crossword.json` file automatically
becomes the active puzzle. Previous weeks' progress is preserved in localStorage
under the old week key.
