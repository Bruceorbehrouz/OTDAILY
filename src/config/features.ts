function envFlag(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const FEATURES = {
  wordle: envFlag(import.meta.env.VITE_ENABLE_WORDLE),
  crossword: envFlag(import.meta.env.VITE_ENABLE_CROSSWORD, true),
  saved: envFlag(import.meta.env.VITE_ENABLE_SAVED),
  textToSpeech: envFlag(import.meta.env.VITE_ENABLE_TEXT_TO_SPEECH),
};
