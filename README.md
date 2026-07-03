# token-cost

Compare what a piece of text costs to send across LLMs — so the cheapest option, and the
size of the gap, are obvious at a glance.

The value is the **engine** (tokenize → look up price → compute cost). The CLI, library, and
(later) GUI are thin adapters over it.

## Status

**MVP 1 — in progress.** Core engine + CLI.

- OpenAI token counts are **exact** (`js-tiktoken`, o200k / cl100k).
- Claude / Gemini / DeepSeek are **estimated** (`cl100k` proxy, clearly labeled `est.`).
- Pricing ships as a bundled snapshot (trimmed from LiteLLM).

## Preview

```
1,240 tokens · o200k

-> gpt-4o-mini is cheapest: $0.19/1K calls
   (16x under gpt-4o)

MODEL          $/1K calls        vs
gpt-4o-mini        $0.19  |          1.0x
gpt-4o             $3.10  ###        16x
o1                $18.60  ########## 100x
```

## Design principles

- **Answer-first** — a one-line verdict before the table.
- **Rank to encode meaning** — cheapest first; position carries information.
- **Relative beats absolute** — ×-multiplier + magnitude bar over raw numbers.
- **Legible units** — `$/1K calls`, not micro-dollars.
- **Progressive disclosure** — compact by default; `-v` / `--json` for more.

## Roadmap

- **MVP 1** — engine + CLI, bundled pricing, OpenAI exact / rest estimated.
- **v1.1** — pricing auto-refresh from a URL (TTL + ETag + offline fallback).
- **v1.x** — static GUI (GitHub Pages) over the same core.
- **v2** — real tokenizers for open models; optional BYOK exact counts for Claude/Gemini.

## Appendix: Token count accuracy

Cost = **tokens × price**. The price is always exact; the **token count** is exact for
some models and estimated for others. Here's why, and what the `*` in the output means.

### What a tokenizer is
Every model splits text into **tokens** (word-fragment-sized pieces) using its own
**tokenizer**. The number of tokens is what you're billed on, so counting them is the
whole game. Different tokenizers split the same text into slightly different token counts.

### Exact vs. estimated

- **OpenAI models → exact.** OpenAI publishes its tokenizers (`o200k_base` for GPT-4o/o1,
  `cl100k_base` for GPT-4/3.5). We bundle them via `js-tiktoken` and count locally, so
  these counts are the model's real token counts. No `*`.

- **Claude / Gemini / DeepSeek / others → estimated.** These providers don't publish a
  downloadable tokenizer. So we approximate: we run the text through OpenAI's `cl100k`
  tokenizer as a **stand-in** and use that count. This is what "estimate" / the `*` marker
  means. The **price is still exact** — only the token count is approximate.

### How far off is the estimate?
For short, common English text, tokenizers agree closely, so the estimate is a good
ballpark. It drifts more on unusual words, code, or non-English text. One known bias:
**Claude 4.7+ and the Claude 5 family use a newer tokenizer that produces ~30% more tokens**
than `cl100k`, so the tool currently **undercounts** those specific models.

### Getting exact counts for every model
The only source of an exact Claude/Gemini count is the provider's `count_tokens` API — a
runtime call with an API key. A future version will support this via **bring-your-own-key**
(you supply your own key; the tool stays serverless). Until then, non-OpenAI models are
clearly labeled estimates.

**Rule of thumb:** trust the ranking and the prices; treat non-OpenAI (`*`) token counts as
approximate, and remember newest Claude runs a bit higher than shown.

## License

TBD
