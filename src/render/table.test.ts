import { describe, it, expect } from "vitest";
import { compare } from "../core/compare.js";
import { renderComparison } from "./table.js";

const render = (text: string, models?: string[]) =>
  renderComparison(compare(text, models), { color: false });

describe("renderComparison", () => {
  it("leads with a verdict naming the cheapest model", () => {
    const out = render("hello world", ["gpt-4o", "gpt-4o-mini", "o1"]);
    const firstMeaningfulLine = out.split("\n").find((l) => l.includes("→"));
    expect(firstMeaningfulLine).toContain("gpt-4o-mini");
    expect(firstMeaningfulLine).toContain("cheapest");
  });

  it("lists models cheapest-first in the table body", () => {
    const out = render("hello world", ["o1", "gpt-4o", "gpt-4o-mini"]);
    const iMini = out.indexOf("gpt-4o-mini");
    const iMid = out.indexOf("\ngpt-4o ");
    const iO1 = out.indexOf("o1 ");
    expect(iMini).toBeGreaterThan(-1);
    expect(iMini).toBeLessThan(iMid);
    expect(iMid).toBeLessThan(iO1);
  });

  it("uses legible $/1K calls units", () => {
    expect(render("hello world", ["gpt-4o"])).toContain("/1K calls");
  });

  it("marks estimated models and adds a footnote", () => {
    const out = render("hello world", ["claude-sonnet-4-5"]);
    expect(out).toContain("claude-sonnet-4-5 *");
    expect(out).toContain("token count estimated");
  });

  it("does not emit ANSI codes when color is off", () => {
    // eslint-disable-next-line no-control-regex
    expect(render("hello world")).not.toMatch(/\x1b\[/);
  });

  it("handles an all-unknown request gracefully", () => {
    expect(render("hi", ["nope"])).toContain("No pricing");
  });
});
