#!/usr/bin/env node
import { VERSION } from "./index.js";
import { compare } from "./core/compare.js";
import { getPricing } from "./core/pricing/pricing.js";
import { renderComparison } from "./render/table.js";
import { shouldColor } from "./render/color.js";

function printHelp(): void {
  console.log(
    [
      `token-cost ${VERSION}`,
      "",
      "Compare what a piece of text costs to send across LLMs.",
      "",
      "Usage:",
      "  token-cost <text>",
      "  cat prompt.txt | token-cost",
      "",
      "Options:",
      "  -h, --help       Show this help",
      "  -V, --version    Show version",
      "",
      `Pricing snapshot as of ${getPricing().asOf}.`,
    ].join("\n"),
  );
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-V")) {
    console.log(`token-cost ${VERSION}`);
    return;
  }
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const positional = args.filter((a) => !a.startsWith("-"));
  let text = positional.join(" ");
  if (text.length === 0) {
    text = await readStdin();
  }

  if (text.trim().length === 0) {
    console.error("token-cost: no input. Pass text as an argument or pipe it via stdin.");
    console.error("Try 'token-cost --help'.");
    process.exitCode = 1;
    return;
  }

  const comparison = compare(text);
  const output = renderComparison(comparison, { color: shouldColor(process.stdout) });
  console.log(output);
}

main().catch((err: unknown) => {
  console.error("token-cost:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
