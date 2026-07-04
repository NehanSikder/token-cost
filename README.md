# token-cost

Compare what a piece of text costs to send across LLMs — see the cheapest model, and the
size of the gap, at a glance.

```
11 tokens · o200k

→ gpt-4o-mini is cheapest: $0.002/1K calls
   100x cheaper than o1

MODEL                $/1K calls              vs
gpt-4o-mini              $0.002  █           1.0x
deepseek-chat *          $0.003  █           1.9x
gpt-4o                   $0.027  ██          17x
o1                       $0.165  ██████████  100x
```

## Install

Not yet on npm. Install from source:

```bash
git clone https://github.com/NehanSikder/token-cost
cd token-cost
npm install && npm run build
npm link          # optional: makes `token-cost` available everywhere
```

Without `npm link`, run it as `node dist/cli.js` in place of `token-cost` below.

## Usage

Pass text as an argument, or pipe it in:

```bash
token-cost "Summarize this article in three bullet points"
cat prompt.txt | token-cost
```

You get a ranked table, cheapest model first, led by a one-line verdict.

## Commands

| Option | What it does |
|---|---|
| `-m, --model <id>` | Compare only these models (repeatable) |
| `-v, --verbose` | Per-model detail: token count, rates, context window |
| `--json` | Machine-readable output (for scripts) |
| `--offline` | Use bundled/cached prices only, no network |
| `-h, --help` | Show help |
| `-V, --version` | Show version |

### Examples

```bash
# compare specific models
token-cost -m gpt-4o -m deepseek-chat "translate this paragraph to French"

# detailed per-model breakdown
token-cost -v "your prompt"

# JSON for scripting — e.g. print the cheapest model
token-cost --json "your prompt" | jq -r '.results[0].model'
```

## A note on the `*`

Cost = tokens × price. **Prices are always exact.** Token counts are exact for most models:

- **OpenAI** — always exact; the tokenizers are public and built in.
- **Open models (DeepSeek, …)** — exact too. The tokenizer is downloaded once on first use
  and cached; offline, they fall back to an estimate.
- **Claude & Gemini** — estimated, because those providers don't publish a tokenizer.
  Estimates are close for typical text; the newest Claude models run roughly 30% higher.

A `*` next to a model means its token count is an estimate, not its exact count.

## License

[MIT](LICENSE)
