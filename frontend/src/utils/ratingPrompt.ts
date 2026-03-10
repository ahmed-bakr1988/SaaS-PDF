export const RATING_PROMPT_EVENT = 'saaspdf:rating-prompt';

interface RatingPromptOptions {
  forceOpen?: boolean;
}

export function dispatchRatingPrompt(toolSlug: string, options: RatingPromptOptions = {}) {
  if (typeof window === 'undefined' || !toolSlug) return;

  window.dispatchEvent(
    new CustomEvent(RATING_PROMPT_EVENT, {
      detail: {
        toolSlug,
        forceOpen: options.forceOpen === true,
      },
    })
  );
}

export function dispatchCurrentToolRatingPrompt(options: RatingPromptOptions = {}) {
  if (typeof window === 'undefined') return;

  const path = window.location.pathname.replace(/\/$/, '');
  if (!path.startsWith('/tools/')) return;

  const toolSlug = path.replace('/tools/', '');
  dispatchRatingPrompt(toolSlug, options);
}