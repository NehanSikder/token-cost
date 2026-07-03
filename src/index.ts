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
  type TokenCount,
  type TokenizerSpec,
  type Encoding,
} from "./core/tokenizer/index.js";
