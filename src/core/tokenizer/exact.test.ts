import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureTokenizer, resetHfTokenizers } from "./hf.js";
import { countTokens } from "./count.js";

const MINI_TOKENIZER = {
  model: {
    type: "WordPiece",
    vocab: { hello: 0, world: 1, "[UNK]": 2 },
    unk_token: "[UNK]",
    continuing_subword_prefix: "##",
    max_input_chars_per_word: 100,
  },
  normalizer: { type: "BertNormalizer" },
  pre_tokenizer: { type: "BertPreTokenizer" },
  post_processor: null,
  decoder: null,
  added_tokens: [],
};

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "token-cost-exact-"));
  process.env["TOKEN_COST_CACHE_DIR"] = dir;
  resetHfTokenizers();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("tokenizer.json")
        ? new Response(JSON.stringify(MINI_TOKENIZER), { status: 200 })
        : new Response(JSON.stringify({}), { status: 200 }),
    ),
  );
});

afterEach(() => {
  delete process.env["TOKEN_COST_CACHE_DIR"];
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  resetHfTokenizers();
});

describe("countTokens with a loaded HF tokenizer", () => {
  it("estimates before the tokenizer is loaded", () => {
    const c = countTokens("hello world", "deepseek-chat");
    expect(c.exact).toBe(false);
    expect(c.encoding).toBe("cl100k_base");
  });

  it("counts exactly once the tokenizer is loaded", async () => {
    await ensureTokenizer("deepseek-chat");
    const c = countTokens("hello world", "deepseek-chat");
    expect(c.exact).toBe(true);
    expect(c.encoding).toBe("deepseek-v3");
    expect(c.tokens).toBe(2);
  });

  it("does not affect OpenAI models (still their own exact tiktoken)", async () => {
    await ensureTokenizer("deepseek-chat");
    const c = countTokens("hello world", "gpt-4o");
    expect(c.exact).toBe(true);
    expect(c.encoding).toBe("o200k_base");
  });
});
