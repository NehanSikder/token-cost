import { describe, it, expect } from "vitest";
import { getPricing, pricingFor, listModels } from "./pricing.js";

describe("pricing snapshot", () => {
  it("carries the curated model set", () => {
    const models = listModels();
    expect(models).toContain("gpt-4o");
    expect(models).toContain("claude-sonnet-4-5");
    expect(models.length).toBeGreaterThanOrEqual(9);
  });

  it("exposes an as-of date for the badge", () => {
    expect(getPricing().asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns per-1M rates for a known model", () => {
    const p = pricingFor("gpt-4o");
    expect(p).toBeDefined();
    expect(p?.input).toBeGreaterThan(0);
    expect(p?.output).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown model", () => {
    expect(pricingFor("no-such-model")).toBeUndefined();
  });
});
