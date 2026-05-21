/**
 * Utility for conditionally joining class names together.
 * A lightweight implementation that doesn't require clsx or tailwind-merge.
 * Filters out falsy values (false, null, undefined, 0, '') and joins the rest.
 */
export function cn(...inputs: (string | undefined | null | false | 0)[]): string {
  return inputs.filter(Boolean).join(' ');
}
