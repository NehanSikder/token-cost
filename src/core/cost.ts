/**
 * Cost math — tokens x rate.
 *
 * Two entry points:
 *  - estimateInputCost(text, model): tokenize text, then price it (the comparator path).
 *  - estimateCost({ model, inputTokens, outputTokens }): price known token counts
 *    (the library / budget path — e.g. logging cost per request).
 */
import { countTokens } from "./tokenizer/index.js";
import { pricingFor, type ModelPricing } from "./pricing/pricing.js";

const PER_MILLION = 1_000_000;

export interface InputCost {
  readonly model: string;
  /** Input tokens counted for the text. */
  readonly tokens: number;
  readonly encoding: string;
  /** false when the token count came from a proxy tokenizer — render as "est.". */
  readonly exact: boolean;
  /** USD to send this text as input, once. */
  readonly inputCostPerCall: number;
  readonly pricing: ModelPricing;
}

/**
 * Tokenize `text` for `model` and compute the input cost of a single call.
 * Returns undefined if we don't carry pricing for the model.
 */
export function estimateInputCost(text: string, model: string): InputCost | undefined {
  const pricing = pricingFor(model);
  if (!pricing) return undefined;
  const count = countTokens(text, model);
  const inputCostPerCall = (count.tokens / PER_MILLION) * pricing.input;
  return {
    model,
    tokens: count.tokens,
    encoding: count.encoding,
    exact: count.exact,
    inputCostPerCall,
    pricing,
  };
}

export interface CostInput {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens?: number;
}

export interface Cost {
  readonly model: string;
  readonly inputCost: number;
  readonly outputCost: number;
  readonly totalCost: number;
  readonly pricing: ModelPricing;
}

/**
 * Price known token counts. Returns undefined if we don't carry pricing for the model.
 */
export function estimateCost(input: CostInput): Cost | undefined {
  const pricing = pricingFor(input.model);
  if (!pricing) return undefined;
  const inputCost = (input.inputTokens / PER_MILLION) * pricing.input;
  const outputCost = ((input.outputTokens ?? 0) / PER_MILLION) * pricing.output;
  return {
    model: input.model,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    pricing,
  };
}
