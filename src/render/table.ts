/**
 * Default CLI output: a one-line verdict over a ranked bar table.
 *
 * Design (brainstorm/architecture.md section 8): answer-first, ranked cheapest->priciest,
 * relative beats absolute (x-multiplier + magnitude bar), legible units ($/1K calls).
 */
import type { Comparison } from "../core/compare.js";
import { getPricing } from "../core/pricing/pricing.js";
import { bold, dim, green, red } from "./color.js";
import { gridLines, type Align } from "./grid.js";

const BAR_WIDTH = 10;
const CALLS = 1000; // report cost per 1K calls for legibility

/** Decimals so the largest value stays legible and the column aligns. */
function decimalsFor(maxValue: number): number {
  if (maxValue >= 1) return 2;
  if (maxValue >= 0.1) return 3;
  if (maxValue >= 0.01) return 4;
  if (maxValue >= 0.001) return 5;
  return 6;
}

function money(value: number, decimals: number): string {
  return `$${value.toFixed(decimals)}`;
}

function multiplier(ratio: number): string {
  return ratio < 10 ? `${ratio.toFixed(1)}x` : `${Math.round(ratio)}x`;
}

/** Linear magnitude bar; any nonzero cost gets at least one cell so it's visible. */
function bar(fraction: number): string {
  if (fraction <= 0) return "";
  return "█".repeat(Math.max(1, Math.round(fraction * BAR_WIDTH)));
}

function padEnd(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - s.length));
}
function padStart(s: string, width: number): string {
  return " ".repeat(Math.max(0, width - s.length)) + s;
}

function header(cmp: Comparison): string {
  const tokenCounts = new Set(cmp.rows.map((r) => r.tokens));
  const encodings = new Set(cmp.rows.map((r) => r.encoding));

  // Token counts agree across models.
  if (tokenCounts.size === 1 && cmp.rows[0]) {
    const n = cmp.rows[0].tokens.toLocaleString();
    // Only name the encoding when they all share one, else counts happen to match.
    return encodings.size === 1
      ? `${n} tokens · ${cmp.rows[0].encoding}`
      : `${n} tokens`;
  }

  const tokens = cmp.rows.map((r) => r.tokens);
  const lo = Math.min(...tokens).toLocaleString();
  const hi = Math.max(...tokens).toLocaleString();
  return `${lo}–${hi} tokens (varies by model; -v for detail)`;
}

export interface RenderOptions {
  readonly color: boolean;
}

/** Render the default verdict + ranked bar table to a string. */
export function renderComparison(cmp: Comparison, opts: RenderOptions): string {
  const on = opts.color;
  if (cmp.rows.length === 0) {
    const asked = cmp.unknownModels.join(", ");
    return `No pricing for the requested model(s): ${asked || "(none)"}`;
  }

  const cheapest = cmp.rows[0]!;
  const priciest = cmp.rows[cmp.rows.length - 1]!;
  const minPerCall = cheapest.inputCostPerCall;
  const maxPerCall = priciest.inputCostPerCall;
  const decimals = decimalsFor(maxPerCall * CALLS);

  const lines: string[] = [];

  // Header
  lines.push(dim(header(cmp), on));
  lines.push("");

  // Verdict (answer-first)
  const cheapestMoney = money(cheapest.inputCostPerCall * CALLS, decimals);
  lines.push(`${bold("→", on)} ${bold(cheapest.model, on)} is cheapest: ${green(`${cheapestMoney}/1K calls`, on)}`);
  if (cmp.rows.length > 1 && maxPerCall > minPerCall && minPerCall > 0) {
    lines.push(dim(`   ${multiplier(maxPerCall / minPerCall)} cheaper than ${priciest.model}`, on));
  }
  lines.push("");

  // Table
  const nameWidth = Math.max(
    ...cmp.rows.map((r) => r.model.length + (r.exact ? 0 : 2)), // room for " *"
    "MODEL".length,
  );
  const moneyStrings = cmp.rows.map((r) => money(r.inputCostPerCall * CALLS, decimals));
  const moneyWidth = Math.max(...moneyStrings.map((s) => s.length), "$/1K calls".length);

  lines.push(
    dim(`${padEnd("MODEL", nameWidth)}  ${padStart("$/1K calls", moneyWidth)}  ${padEnd("", BAR_WIDTH)}  vs`, on),
  );

  let anyEstimate = false;
  cmp.rows.forEach((row, i) => {
    const isCheapest = i === 0;
    const isPriciest = i === cmp.rows.length - 1 && cmp.rows.length > 1;
    const label = row.exact ? row.model : `${row.model} *`;
    if (!row.exact) anyEstimate = true;

    const moneyStr = money(row.inputCostPerCall * CALLS, decimals);
    const coloredMoney = isCheapest
      ? green(moneyStr, on)
      : isPriciest
        ? red(moneyStr, on)
        : moneyStr;

    const frac = maxPerCall > 0 ? row.inputCostPerCall / maxPerCall : 0;
    const ratio = minPerCall > 0 ? row.inputCostPerCall / minPerCall : 1;

    lines.push(
      `${padEnd(label, nameWidth)}  ${padStart(coloredMoney, moneyWidth + (coloredMoney.length - moneyStr.length))}  ${padEnd(bar(frac), BAR_WIDTH)}  ${multiplier(ratio)}`,
    );
  });

  // Footnotes
  const notes: string[] = [];
  if (anyEstimate) {
    notes.push("* token count estimated (cl100k proxy); pricing is exact");
  }
  if (cmp.unknownModels.length > 0) {
    notes.push(`no pricing for: ${cmp.unknownModels.join(", ")}`);
  }
  if (notes.length > 0) {
    lines.push("");
    for (const n of notes) lines.push(dim(n, on));
  }

  return lines.join("\n");
}

/**
 * Verbose view: full per-model detail (token count, encoding, raw rates, context,
 * cost) as an aligned grid, plus the pricing "as of" date.
 */
export function renderVerbose(cmp: Comparison, opts: RenderOptions): string {
  const on = opts.color;
  if (cmp.rows.length === 0) {
    return renderComparison(cmp, opts);
  }

  const minPerCall = cmp.rows[0]!.inputCostPerCall;
  const maxPerCall = cmp.rows[cmp.rows.length - 1]!.inputCostPerCall;
  const decimals = decimalsFor(maxPerCall * CALLS);

  const headers = [
    "MODEL",
    "TOKENS",
    "ENC",
    "IN $/1M",
    "OUT $/1M",
    "CTX",
    "$/1K calls",
    "vs",
  ];
  const align: Align[] = [
    "left",
    "right",
    "left",
    "right",
    "right",
    "right",
    "right",
    "right",
  ];
  const rows = cmp.rows.map((r) => [
    r.exact ? r.model : `${r.model} *`,
    r.tokens.toLocaleString(),
    r.encoding.replace("_base", ""),
    `$${r.pricing.input}`,
    `$${r.pricing.output}`,
    r.pricing.context != null ? r.pricing.context.toLocaleString() : "—",
    money(r.inputCostPerCall * CALLS, decimals),
    multiplier(minPerCall > 0 ? r.inputCostPerCall / minPerCall : 1),
  ]);

  const grid = gridLines(headers, rows, align);
  const lines: string[] = [dim(header(cmp), on), "", dim(grid[0]!, on), ...grid.slice(1)];

  const notes: string[] = [];
  if (cmp.rows.some((r) => !r.exact)) {
    notes.push("* token count estimated (cl100k proxy); pricing is exact");
  }
  if (cmp.unknownModels.length > 0) {
    notes.push(`no pricing for: ${cmp.unknownModels.join(", ")}`);
  }
  notes.push(`prices as of ${getPricing().asOf}`);
  lines.push("");
  for (const n of notes) lines.push(dim(n, on));

  return lines.join("\n");
}
