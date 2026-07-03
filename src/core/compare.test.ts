import { describe, it, expect } from "vitest";
import { compare } from "./compare.js";

describe("compare", () => {
  it("ranks cheapest first", () => {
    const { rows } = compare("hello world", ["o1", "gpt-4o-mini", "gpt-4o"]);
    expect(rows.map((r) => r.model)).toEqual(["gpt-4o-mini", "gpt-4o", "o1"]);
  });

  it("uses the full curated set when no models are given", () => {
    const { rows } = compare("hello world");
    expect(rows.length).toBeGreaterThanOrEqual(9);
  });

  it("collects unknown models instead of throwing", () => {
    const { rows, unknownModels } = compare("hi", ["gpt-4o", "not-a-model"]);
    expect(rows.map((r) => r.model)).toEqual(["gpt-4o"]);
    expect(unknownModels).toEqual(["not-a-model"]);
  });

  it("is sorted by ascending cost per call", () => {
    const { rows } = compare("the quick brown fox jumps over the lazy dog");
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.inputCostPerCall).toBeGreaterThanOrEqual(rows[i - 1]!.inputCostPerCall);
    }
  });
});
