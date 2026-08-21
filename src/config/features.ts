function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/**
 * Every feature ships on by default, so a plain build — local or deployed —
 * gives readers the whole app. Set the matching VITE_ENABLE_* variable to
 * false to turn one off for a particular build.
 */
export const FEATURES = {
  wordle: envFlag(import.meta.env.VITE_ENABLE_WORDLE, true),
  crossword: envFlag(import.meta.env.VITE_ENABLE_CROSSWORD, true),
  saved: envFlag(import.meta.env.VITE_ENABLE_SAVED, true),
  textToSpeech: envFlag(import.meta.env.VITE_ENABLE_TEXT_TO_SPEECH, true),
};
