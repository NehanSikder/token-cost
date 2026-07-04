/**
 * token-cost — public library entrypoint.
 *
 * The engine (tokenize -> price -> cost) will be exported from here.
 * Scaffold placeholder for MVP 1 increment 1.
 */

export const VERSION = "0.0.1";

export {
  countTokens,
  resolveTokenizer,
  ensureTokenizers,
  ensureTokenizer,
  hasHfTokenizer,
  type TokenCount,
  type TokenizerSpec,
  type Encoding,
  type EnsureOptions,
} from "./core/tokenizer/index.js";

export {
  estimateCost,
  estimateInputCost,
  type Cost,
  type CostInput,
  type InputCost,
} from "./core/cost.js";

export {
  getPricing,
  pricingFor,
  listModels,
  type ModelPricing,
  type PricingTable,
} from "./core/pricing/pricing.js";

export { compare, type Comparison } from "./core/compare.js";
