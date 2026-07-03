import { describe, it, expect } from "vitest";
import { compare } from "../core/compare.js";
import { renderVerbose } from "./table.js";

const render = (text: string, models?: string[]) =>
  renderVerbose(compare(text, models), { color: false });

describe("renderVerbose", () => {
  it("includes per-model detail columns", () => {
    const out = render("hello world", ["gpt-4o", "gpt-4o-mini"]);
    for (const col of ["TOKENS", "ENC", "IN $/1M", "OUT $/1M", "CTX", "$/1K calls"]) {
      expect(out).toContain(col);
    }
  });

  it("shows the pricing as-of date", () => {
    expect(render("hi", ["gpt-4o"])).toMatch(/prices as of \d{4}-\d{2}-\d{2}/);
  });

  it("marks estimated models", () => {
    expect(render("hi", ["deepseek-chat"])).toContain("deepseek-chat *");
  });

  it("emits no ANSI codes with color off", () => {
    // eslint-disable-next-line no-control-regex
    expect(render("hello world")).not.toMatch(/\x1b\[/);
  });
});
