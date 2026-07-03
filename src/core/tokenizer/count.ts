/**
 * Token counting over the pluggable registry.
 *
 * Encoders are cached by encoding name because constructing a tiktoken encoder
 * (loading the merge ranks) is comparatively expensive; counting is called once
 * per model per run.
 */
import { getEncoding, type Tiktoken } from "js-tiktoken";
import { resolveTokenizer, type Encoding } from "./registry.js";

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
  readonly encoding: Encoding;
  /** false when the count comes from a proxy tokenizer — surface this as "est." */
  readonly exact: boolean;
}

/**
 * Count the tokens in `text` for a given `model`. Uses the model's real encoding
 * when available (exact), otherwise a cl100k proxy (estimate).
 */
export function countTokens(text: string, model: string): TokenCount {
  const spec = resolveTokenizer(model);
  const tokens = encoderFor(spec.encoding).encode(text).length;
  return { model, tokens, encoding: spec.encoding, exact: spec.exact };
}
