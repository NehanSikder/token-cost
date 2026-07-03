/**
 * Minimal aligned-column text grid. Operates on plain strings only (no color),
 * so width math stays correct; callers color the returned lines afterward.
 */
export type Align = "left" | "right";

export function gridLines(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  align: readonly Align[],
  gap = "  ",
): string[] {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );

  const format = (cells: readonly string[]): string =>
    cells
      .map((c, i) => {
        const w = widths[i] ?? c.length;
        return align[i] === "right" ? c.padStart(w) : c.padEnd(w);
      })
      .join(gap)
      .trimEnd();

  return [format(headers), ...rows.map(format)];
}
