/**
 * Client-side text processing utilities.
 * These run entirely in the browser — no API calls needed.
 */

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: string;
}

/**
 * Count words, characters, sentences, and paragraphs.
 * Supports both English and Arabic text.
 */
export function countText(text: string): TextStats {
  if (!text.trim()) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTime: '0 min',
    };
  }

  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;

  // Word count — split by whitespace, filter empty
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // Sentence count — split by sentence-ending punctuation
  const sentences = text
    .split(/[.!?؟。]+/)
    .filter((s) => s.trim().length > 0).length;

  // Paragraph count — split by double newlines or single newlines
  const paragraphs = text
    .split(/\n\s*\n|\n/)
    .filter((p) => p.trim().length > 0).length;

  // Reading time (avg 200 words/min for English, 150 for Arabic)
  const avgWPM = 180;
  const minutes = Math.ceil(words / avgWPM);
  const readingTime = minutes <= 1 ? '< 1 min' : `${minutes} min`;

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingTime,
  };
}

/**
 * Remove extra whitespace (multiple spaces, tabs, etc.)
 */
export function removeExtraSpaces(text: string): string {
  return text
    .replace(/[^\S\n]+/g, ' ')     // multiple spaces → single space
    .replace(/\n{3,}/g, '\n\n')    // 3+ newlines → 2
    .trim();
}

/**
 * Convert text case.
 */
export function convertCase(
  text: string,
  type: 'upper' | 'lower' | 'title' | 'sentence'
): string {
  switch (type) {
    case 'upper':
      return text.toUpperCase();

    case 'lower':
      return text.toLowerCase();

    case 'title':
      return text.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
      );

    case 'sentence':
      return text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?؟]\s*\w)/g, (match) => match.toUpperCase());

    default:
      return text;
  }
}

/**
 * Remove Arabic diacritics (tashkeel) from text.
 */
export function removeDiacritics(text: string): string {
  // Arabic diacritics Unicode range: \u064B-\u065F, \u0670
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
