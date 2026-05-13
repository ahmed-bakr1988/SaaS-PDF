export const RATING_PROMPT_EVENT = 'dociva:rating-prompt';

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
  const match = path.match(/^(?:\/[a-z]{2})?\/tools\/(.+)$/);
  
  if (!match) return;

  const toolSlug = match[1];
  dispatchRatingPrompt(toolSlug, options);
}