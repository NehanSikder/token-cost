/**
 * Zero-dependency ANSI coloring. All helpers no-op when `on` is false, so callers
 * pass a single `useColor` flag (TTY && !NO_COLOR) and never branch themselves.
 */
const wrap = (code: string, s: string, on: boolean): string =>
  on ? `\x1b[${code}m${s}\x1b[0m` : s;

export const green = (s: string, on: boolean): string => wrap("32", s, on);
export const red = (s: string, on: boolean): string => wrap("31", s, on);
export const dim = (s: string, on: boolean): string => wrap("2", s, on);
export const bold = (s: string, on: boolean): string => wrap("1", s, on);

/** Whether color should be used for a given stream, honoring NO_COLOR. */
export function shouldColor(stream: { isTTY?: boolean }): boolean {
  return Boolean(stream.isTTY) && !process.env["NO_COLOR"];
}
