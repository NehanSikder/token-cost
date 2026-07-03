import { describe, it, expect } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("collects positional text", () => {
    expect(parseArgs(["hello", "world"]).text).toBe("hello world");
  });

  it("collects repeated -m / --model values", () => {
    expect(parseArgs(["-m", "gpt-4o", "--model", "deepseek-chat", "hi"]).models).toEqual([
      "gpt-4o",
      "deepseek-chat",
    ]);
  });

  it("supports --model=id and -m=id forms", () => {
    expect(parseArgs(["--model=gpt-4o", "-m=o1"]).models).toEqual(["gpt-4o", "o1"]);
  });

  it("parses boolean flags", () => {
    const p = parseArgs(["--json", "-v", "text"]);
    expect(p.json).toBe(true);
    expect(p.verbose).toBe(true);
  });

  it("flags a missing -m value instead of eating the next flag", () => {
    const p = parseArgs(["-m", "--json"]);
    expect(p.json).toBe(true);
    expect(p.models).toEqual([]);
    expect(p.unknownFlags).toContain("-m (missing value)");
  });

  it("records unknown flags", () => {
    expect(parseArgs(["--bogus", "hi"]).unknownFlags).toContain("--bogus");
  });
});
