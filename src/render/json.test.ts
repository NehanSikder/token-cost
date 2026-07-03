import { describe, it, expect } from "vitest";
import { compare } from "../core/compare.js";
import { renderJson } from "./json.js";

describe("renderJson", () => {
  it("emits valid JSON with ranked results and derived fields", () => {
    const parsed = JSON.parse(renderJson(compare("hello world", ["o1", "gpt-4o-mini"])));

    expect(parsed.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.input.chars).toBe("hello world".length);
    expect(parsed.results.map((r: { model: string }) => r.model)).toEqual([
      "gpt-4o-mini",
      "o1",
    ]);

    const cheapest = parsed.results[0];
    expect(cheapest.multiplierVsCheapest).toBe(1);
    expect(cheapest.inputCostPer1KCalls).toBeCloseTo(cheapest.inputCostPerCall * 1000, 12);
    expect(cheapest.exact).toBe(true);
  });

  it("reports unknown models", () => {
    const parsed = JSON.parse(renderJson(compare("hi", ["gpt-4o", "nope"])));
    expect(parsed.unknownModels).toEqual(["nope"]);
  });
});
