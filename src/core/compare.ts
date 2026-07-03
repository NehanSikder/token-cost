/**
 * Compare the input cost of one text across a set of models, ranked cheapest first.
 */
import { estimateInputCost, type InputCost } from "./cost.js";
import { listModels } from "./pricing/pricing.js";

export interface Comparison {
  readonly text: string;
  /** Priced rows, sorted by input cost per call, cheapest first. */
  readonly rows: readonly InputCost[];
  /** Requested models we don't carry pricing for (skipped in rows). */
  readonly unknownModels: readonly string[];
}

/**
 * Price `text` across `models` (or the full curated set when none are given) and
 * return rows sorted cheapest -> priciest. Unknown models are collected, not thrown.
 */
export function compare(text: string, models?: readonly string[]): Comparison {
  const ids = models && models.length > 0 ? models : listModels();
  const rows: InputCost[] = [];
  const unknownModels: string[] = [];

  for (const id of ids) {
    const priced = estimateInputCost(text, id);
    if (priced) {
      rows.push(priced);
    } else {
      unknownModels.push(id);
    }
  }

  rows.sort((a, b) => a.inputCostPerCall - b.inputCostPerCall);
  return { text, rows, unknownModels };
}
