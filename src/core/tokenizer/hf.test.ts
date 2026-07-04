import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureTokenizer,
  ensureTokenizers,
  loadedTokenizer,
  hasHfTokenizer,
  hfLabel,
  resetHfTokenizers,
} from "./hf.js";

// A minimal but valid WordPiece tokenizer — stands in for a real (multi-MB) one.
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
const MINI_CONFIG = {};

function mockHubFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("tokenizer.json")) {
        return new Response(JSON.stringify(MINI_TOKENIZER), { status: 200 });
      }
      if (url.endsWith("tokenizer_config.json")) {
        return new Response(JSON.stringify(MINI_CONFIG), { status: 200 });
      }
      return new Response(null, { status: 404 });
    }),
  );
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "token-cost-hf-"));
  process.env["TOKEN_COST_CACHE_DIR"] = dir;
  resetHfTokenizers();
});

afterEach(() => {
  delete process.env["TOKEN_COST_CACHE_DIR"];
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  resetHfTokenizers();
});

describe("registry helpers", () => {
  it("knows which models have HF tokenizers", () => {
    expect(hasHfTokenizer("deepseek-chat")).toBe(true);
    expect(hasHfTokenizer("gpt-4o")).toBe(false);
    expect(hasHfTokenizer("claude-sonnet-4-5")).toBe(false);
  });

  it("exposes a label for HF models", () => {
    expect(hfLabel("deepseek-chat")).toBe("deepseek-v3");
    expect(hfLabel("gpt-4o")).toBeUndefined();
  });
});

describe("ensureTokenizer", () => {
  it("downloads, caches, and loads a tokenizer", async () => {
    mockHubFetch();
    const started: string[] = [];
    const ok = await ensureTokenizer("deepseek-chat", {
      onDownloadStart: (m) => started.push(m),
    });
    expect(ok).toBe(true);
    expect(started).toEqual(["deepseek-chat"]);
    expect(loadedTokenizer("deepseek-chat")).toBeDefined();
    expect(loadedTokenizer("deepseek-chat")!.encode("hello world").ids).toEqual([0, 1]);
  });

  it("serves a second call from the on-disk cache without re-fetching", async () => {
    mockHubFetch();
    await ensureTokenizer("deepseek-chat");
    resetHfTokenizers(); // drop memory, keep disk cache
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const ok = await ensureTokenizer("deepseek-chat");
    expect(ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns false offline with no cache (caller falls back to estimate)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const ok = await ensureTokenizer("deepseek-chat", { offline: true });
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns false when the download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await ensureTokenizer("deepseek-chat")).toBe(false);
  });

  it("returns false for a model with no HF tokenizer", async () => {
    expect(await ensureTokenizer("gpt-4o")).toBe(false);
  });
});

describe("ensureTokenizers", () => {
  it("loads only HF-capable models from a mixed list", async () => {
    mockHubFetch();
    await ensureTokenizers(["gpt-4o", "deepseek-chat", "claude-sonnet-4-5"]);
    expect(loadedTokenizer("deepseek-chat")).toBeDefined();
    expect(loadedTokenizer("gpt-4o")).toBeUndefined();
  });
});
