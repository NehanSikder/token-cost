import { describe, it, expect } from "vitest";
import { estimateCost, estimateInputCost } from "./cost.js";

describe("estimateCost (known token counts)", () => {
  it("prices input tokens at the per-1M rate", () => {
    // gpt-4o input = $2.5 / 1M tokens -> 1000 tokens = $0.0025
    const c = estimateCost({ model: "gpt-4o", inputTokens: 1000 });
    expect(c?.inputCost).toBeCloseTo(0.0025, 10);
    expect(c?.outputCost).toBe(0);
    expect(c?.totalCost).toBeCloseTo(0.0025, 10);
  });

  it("adds output cost when output tokens are given", () => {
    // gpt-4o output = $10 / 1M -> 1000 output tokens = $0.01
    const c = estimateCost({ model: "gpt-4o", inputTokens: 1000, outputTokens: 1000 });
    expect(c?.totalCost).toBeCloseTo(0.0025 + 0.01, 10);
  });

  it("returns undefined for an unknown model", () => {
    expect(estimateCost({ model: "no-such-model", inputTokens: 100 })).toBeUndefined();
  });
});

describe("estimateInputCost (from text)", () => {
  it("tokenizes then prices, carrying exactness through", () => {
    const c = estimateInputCost("hello world", "gpt-4o");
    expect(c?.tokens).toBe(2);
    expect(c?.exact).toBe(true);
    // 2 tokens * $2.5/1M
    expect(c?.inputCostPerCall).toBeCloseTo((2 / 1_000_000) * 2.5, 12);
  });

  it("flags estimated tokenizers for non-OpenAI models", () => {
    const c = estimateInputCost("hello world", "claude-sonnet-4-5");
    expect(c?.exact).toBe(false);
  });

  it("returns undefined when pricing is missing", () => {
    expect(estimateInputCost("hi", "no-such-model")).toBeUndefined();
  });
});
