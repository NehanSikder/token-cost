import { describe, it, expect } from "vitest";
import { resolveTokenizer } from "./registry.js";
import { countTokens } from "./count.js";

describe("resolveTokenizer", () => {
  it("maps gpt-4o to exact o200k", () => {
    expect(resolveTokenizer("gpt-4o")).toEqual({ encoding: "o200k_base", exact: true });
  });

  it("maps gpt-4o-mini to exact o200k (prefix)", () => {
    expect(resolveTokenizer("gpt-4o-mini")).toEqual({ encoding: "o200k_base", exact: true });
  });

  it("maps legacy gpt-4-turbo to exact cl100k, not o200k", () => {
    expect(resolveTokenizer("gpt-4-turbo")).toEqual({ encoding: "cl100k_base", exact: true });
  });

  it("maps claude to a cl100k estimate", () => {
    expect(resolveTokenizer("claude-opus-4-8")).toEqual({
      encoding: "cl100k_base",
      exact: false,
    });
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveTokenizer("  GPT-4o  ")).toEqual({ encoding: "o200k_base", exact: true });
  });

  it("falls back to an estimate for unknown models", () => {
    expect(resolveTokenizer("some-random-model").exact).toBe(false);
  });
});

describe("countTokens", () => {
  it("counts gpt-4o exactly with o200k", () => {
    const result = countTokens("hello world", "gpt-4o");
    expect(result).toEqual({
      model: "gpt-4o",
      tokens: 2,
      encoding: "o200k_base",
      exact: true,
    });
  });

  it("flags non-OpenAI models as estimates", () => {
    const result = countTokens("hello world", "claude-opus-4-8");
    expect(result.exact).toBe(false);
    expect(result.encoding).toBe("cl100k_base");
  });

  it("returns zero tokens for an empty string", () => {
    expect(countTokens("", "gpt-4o").tokens).toBe(0);
  });

  it("is monotonic — more text, at least as many tokens", () => {
    const short = countTokens("hello", "gpt-4o").tokens;
    const long = countTokens("hello there, how are you today?", "gpt-4o").tokens;
    expect(long).toBeGreaterThan(short);
  });
});
