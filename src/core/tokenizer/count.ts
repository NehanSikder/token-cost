/**
 * Token counting over the pluggable registry.
 *
 * Encoders are cached by encoding name because constructing a tiktoken encoder
 * (loading the merge ranks) is comparatively expensive; counting is called once
 * per model per run.
 */
import { getEncoding, type Tiktoken } from "js-tiktoken";
import { resolveTokenizer, type Encoding } from "./registry.js";
import { loadedTokenizer, hfLabel } from "./hf.js";

const encoderCache = new Map<Encoding, Tiktoken>();

function encoderFor(encoding: Encoding): Tiktoken {
  let encoder = encoderCache.get(encoding);
  if (!encoder) {
    encoder = getEncoding(encoding);
    encoderCache.set(encoding, encoder);
  }
  return encoder;
}

export interface TokenCount {
  readonly model: string;
  readonly tokens: number;
  /** tiktoken encoding name, or an HF tokenizer label for open models. */
  readonly encoding: string;
  /** false when the count comes from a proxy tokenizer — surface this as "est." */
  readonly exact: boolean;
}

/**
 * Count the tokens in `text` for a given `model`. Prefers the model's real
 * tokenizer when available — a loaded HF tokenizer for open models (see hf.ts),
 * or the model's own tiktoken encoding for OpenAI — otherwise a cl100k proxy
 * (estimate). HF tokenizers are only loaded when the caller has run
 * ensureTokenizers() first; until then this falls back to the estimate.
 */
export function countTokens(text: string, model: string): TokenCount {
  const hf = loadedTokenizer(model);
  if (hf) {
    return { model, tokens: hf.encode(text).ids.length, encoding: hfLabel(model) ?? "hf", exact: true };
  }
  const spec = resolveTokenizer(model);
  const tokens = encoderFor(spec.encoding).encode(text).length;
  return { model, tokens, encoding: spec.encoding, exact: spec.exact };
}
