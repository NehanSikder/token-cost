/**
 * Regenerate data/pricing.json from LiteLLM's community-maintained price table.
 *
 * This is the "robot" from brainstorm/architecture.md section 6. MVP 1 runs it by
 * hand; v1.1 wires it into a weekly GitHub Action. Output is a trimmed snapshot of
 * a curated model set, with costs normalized to USD per 1M tokens for legibility.
 *
 * Usage: node scripts/build-pricing.mjs
 */
import { writeFileSync } from "node:fs";

const SOURCE =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

// Curated default set: our display id -> LiteLLM key.
const MODELS = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  o1: "o1",
  "gpt-4-turbo": "gpt-4-turbo",
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-haiku-4-5": "claude-haiku-4-5",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "deepseek-chat": "deepseek/deepseek-chat",
  // Open-weight models priced at a representative host (open weights have no single price).
  "llama-3.3-70b": "groq/llama-3.3-70b-versatile",
  "qwen2.5-72b": "deepinfra/Qwen/Qwen2.5-72B-Instruct",
};

const round = (n) => Math.round(n * 1e6) / 1e6;

const res = await fetch(SOURCE);
if (!res.ok) {
  console.error(`Failed to fetch LiteLLM data: HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();

const models = {};
const missing = [];
for (const [id, key] of Object.entries(MODELS)) {
  const entry = data[key];
  if (
    !entry ||
    entry.input_cost_per_token == null ||
    entry.output_cost_per_token == null
  ) {
    missing.push(`${id} (${key})`);
    continue;
  }
  models[id] = {
    input: round(entry.input_cost_per_token * 1e6),
    output: round(entry.output_cost_per_token * 1e6),
    context: entry.max_input_tokens ?? null,
    provider: entry.litellm_provider ?? null,
  };
}

if (missing.length) {
  console.error(`WARNING: no LiteLLM entry for: ${missing.join(", ")}`);
}

const out = {
  as_of: new Date().toISOString().slice(0, 10),
  source: "litellm/model_prices_and_context_window.json",
  unit: "usd_per_million_tokens",
  models,
};

const target = new URL("../src/core/pricing/pricing.json", import.meta.url);
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${Object.keys(models).length} models to src/core/pricing/pricing.json`);
