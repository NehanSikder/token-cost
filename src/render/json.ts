/**
 * Machine-readable output for `--json`. Faithful numbers (no formatting/rounding
 * beyond what the engine produced) plus a couple of convenience derivations.
 */
import type { Comparison } from "../core/compare.js";
import { getPricing } from "../core/pricing/pricing.js";

export function renderJson(cmp: Comparison): string {
  const minPerCall = cmp.rows[0]?.inputCostPerCall ?? 0;

  const results = cmp.rows.map((r) => ({
    model: r.model,
    tokens: r.tokens,
    encoding: r.encoding,
    exact: r.exact,
    inputPer1M: r.pricing.input,
    outputPer1M: r.pricing.output,
    context: r.pricing.context,
    provider: r.pricing.provider,
    inputCostPerCall: r.inputCostPerCall,
    inputCostPer1KCalls: r.inputCostPerCall * 1000,
    multiplierVsCheapest: minPerCall > 0 ? r.inputCostPerCall / minPerCall : 1,
  }));

  return JSON.stringify(
    {
      asOf: getPricing().asOf,
      input: { chars: cmp.text.length },
      results,
      unknownModels: cmp.unknownModels,
    },
    null,
    2,
  );
}
