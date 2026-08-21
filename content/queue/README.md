# Article queue

Drop article JSON files in this folder — as many as you like, filenames don't
matter. On the next build (or when you run `npm run articles:schedule`) each one
is assigned the next free publication date, starting with today in Vancouver and
skipping any date that already has an article, and written out to
`public/articles/<date>.json`.

See [`ARTICLES.md`](../../ARTICLES.md) for the article format and the full
workflow.
