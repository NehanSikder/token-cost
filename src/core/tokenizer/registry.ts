/**
 * Pluggable tokenizer registry.
 *
 * Maps a model id to a tokenizer spec. This is the seam that lets a model move
 * from "estimated" to "exact" with a one-line change (see brainstorm/architecture.md
 * section 5). Today: OpenAI models resolve to their real encoding (exact); everything
 * else falls back to a cl100k proxy flagged as an estimate.
 */

export type Encoding = "o200k_base" | "cl100k_base";

export interface TokenizerSpec {
  /** Which tiktoken encoding to use for counting. */
  readonly encoding: Encoding;
  /** true = the model's real tokenizer; false = a proxy estimate (label it "est."). */
  readonly exact: boolean;
}

interface Rule {
  readonly test: RegExp;
  readonly spec: TokenizerSpec;
}

/**
 * Ordered rules — first match wins. `gpt-4o` must be tested before `gpt-4`
 * so it does not get captured by the legacy rule.
 */
const RULES: readonly Rule[] = [
  // OpenAI current generation → o200k (exact)
  {
    test: /^(gpt-4o|gpt-4\.1|gpt-5|o1|o3|o4|chatgpt-4o)/,
    spec: { encoding: "o200k_base", exact: true },
  },
  // OpenAI legacy → cl100k (exact)
  {
    test: /^(gpt-4|gpt-3\.5|text-embedding-3)/,
    spec: { encoding: "cl100k_base", exact: true },
  },
];

/** cl100k proxy for any model without a bundled exact tokenizer (Claude/Gemini/DeepSeek/…). */
const ESTIMATE_DEFAULT: TokenizerSpec = { encoding: "cl100k_base", exact: false };

/**
 * Resolve the tokenizer for a model id. Never throws — unknown models fall back
 * to the estimate default so the tool always produces a (clearly-labeled) number.
 */
export function resolveTokenizer(model: string): TokenizerSpec {
  const normalized = model.trim().toLowerCase();
  for (const rule of RULES) {
    if (rule.test.test(normalized)) {
      return rule.spec;
    }
  }
  return ESTIMATE_DEFAULT;
}
