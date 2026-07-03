#!/usr/bin/env node
import { VERSION } from "./index.js";
import { compare } from "./core/compare.js";
import { activatePricing, getPricing } from "./core/pricing/pricing.js";
import { refreshPricing, isOffline } from "./core/pricing/refresh.js";
import { parseArgs } from "./cli/args.js";
import { renderComparison, renderVerbose } from "./render/table.js";
import { renderJson } from "./render/json.js";
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
      "  token-cost -m gpt-4o -m deepseek-chat <text>",
      "",
      "Options:",
      "  -m, --model <id>   Compare only these models (repeatable)",
      "  -v, --verbose      Show per-model detail (tokens, rates, context)",
      "      --json         Machine-readable output",
      "      --offline      Skip the pricing refresh (bundled/cached data only)",
      "  -h, --help         Show this help",
      "  -V, --version      Show version",
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
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    console.log(`token-cost ${VERSION}`);
    return;
  }
  if (args.help) {
    printHelp();
    return;
  }
  if (args.unknownFlags.length > 0) {
    console.error(`token-cost: unknown option(s): ${args.unknownFlags.join(", ")}`);
    console.error("Try 'token-cost --help'.");
    process.exitCode = 1;
    return;
  }

  let text = args.text;
  if (text.length === 0) {
    text = await readStdin();
  }
  if (text.trim().length === 0) {
    console.error("token-cost: no input. Pass text as an argument or pipe it via stdin.");
    console.error("Try 'token-cost --help'.");
    process.exitCode = 1;
    return;
  }

  // Refresh pricing before comparing: zero network when the cache is fresh,
  // and every failure path falls back to cached/bundled data (never blocks).
  const refreshed = await refreshPricing({
    offline: args.offline || isOffline(),
  });
  if (refreshed.snapshot) {
    activatePricing({
      as_of: refreshed.snapshot.as_of,
      source: refreshed.snapshot.source,
      unit: refreshed.snapshot.unit,
      models: refreshed.snapshot.models,
    });
  }

  const comparison = compare(text, args.models);

  let output: string;
  if (args.json) {
    output = renderJson(comparison);
  } else if (args.verbose) {
    output = renderVerbose(comparison, { color: shouldColor(process.stdout) });
  } else {
    output = renderComparison(comparison, { color: shouldColor(process.stdout) });
  }
  console.log(output);
}

main().catch((err: unknown) => {
  console.error("token-cost:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
