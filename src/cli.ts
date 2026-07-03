#!/usr/bin/env node
import { VERSION } from "./index.js";

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-V")) {
  console.log(`token-cost ${VERSION}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(
    [
      `token-cost ${VERSION}`,
      "",
      "Compare what a piece of text costs to send across LLMs.",
      "",
      "Usage:",
      "  token-cost <text>",
      '  cat prompt.txt | token-cost',
      "",
      "  (engine not wired up yet — MVP 1 scaffold)",
    ].join("\n"),
  );
  process.exit(0);
}

console.log("token-cost: engine coming next. You passed:", args.join(" "));
