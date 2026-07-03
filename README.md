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

## License

TBD
