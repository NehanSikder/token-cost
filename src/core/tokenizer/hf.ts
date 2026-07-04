/**
 * Exact tokenization for open-weight models via their published HuggingFace
 * tokenizers (v2 — brainstorm/architecture.md §5).
 *
 * The tokenizer files are large (DeepSeek's is ~8MB), so they are NOT bundled.
 * Instead they are lazily downloaded from the HF hub the first time a model is
 * compared, then cached under ~/.cache/token-cost/tokenizers/. Offline or on any
 * failure the caller falls back to the cl100k estimate (current behavior) — this
 * layer never throws and never blocks.
 */
import { Tokenizer } from "@huggingface/tokenizers";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheDir } from "../paths.js";

interface HfEntry {
  /** HuggingFace repo id holding tokenizer.json + tokenizer_config.json. */
  readonly repo: string;
  /** Short label shown in place of an encoding name (e.g. verbose table). */
  readonly label: string;
}

/** Open-weight models whose real tokenizer can be loaded from the HF hub. */
const HF_MODELS: Readonly<Record<string, HfEntry>> = {
  "deepseek-chat": { repo: "deepseek-ai/DeepSeek-V3", label: "deepseek-v3" },
};

const HF_BASE = "https://huggingface.co";
const DOWNLOAD_TIMEOUT_MS = 30_000; // tokenizer.json can be several MB

/** In-memory cache of constructed tokenizers, keyed by model id. */
const loaded = new Map<string, Tokenizer>();

type TokenizerArgs = ConstructorParameters<typeof Tokenizer>;

export function hasHfTokenizer(model: string): boolean {
  return model in HF_MODELS;
}

export function hfLabel(model: string): string | undefined {
  return HF_MODELS[model]?.label;
}

/** The constructed tokenizer for a model, if it has been loaded this run. */
export function loadedTokenizer(model: string): Tokenizer | undefined {
  return loaded.get(model);
}

function repoDir(repo: string): string {
  return join(cacheDir(), "tokenizers", repo.replace(/\//g, "__"));
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

async function download(repo: string): Promise<{ tj: unknown; tc: unknown } | null> {
  const tj = await fetchJson(`${HF_BASE}/${repo}/resolve/main/tokenizer.json`);
  const tc = await fetchJson(`${HF_BASE}/${repo}/resolve/main/tokenizer_config.json`);
  if (!tj || !tc) return null;
  try {
    const dir = repoDir(repo);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "tokenizer.json"), JSON.stringify(tj));
    writeFileSync(join(dir, "tokenizer_config.json"), JSON.stringify(tc));
  } catch {
    // Cache-write failure is non-fatal; we still return the in-memory copy.
  }
  return { tj, tc };
}

export interface EnsureOptions {
  /** Skip the network; use only an existing on-disk cache. */
  readonly offline?: boolean;
  /** Invoked once, right before a network download starts (for a user notice). */
  readonly onDownloadStart?: (model: string, repo: string) => void;
}

/**
 * Ensure the exact tokenizer for `model` is loaded in memory. Returns true if it
 * is available (exact counting possible), false if the caller should fall back to
 * the estimate. Never throws.
 */
export async function ensureTokenizer(model: string, opts: EnsureOptions = {}): Promise<boolean> {
  if (loaded.has(model)) return true;
  const entry = HF_MODELS[model];
  if (!entry) return false;

  const dir = repoDir(entry.repo);
  let tj = readJson(join(dir, "tokenizer.json"));
  let tc = readJson(join(dir, "tokenizer_config.json"));

  if (!tj || !tc) {
    if (opts.offline) return false;
    opts.onDownloadStart?.(model, entry.repo);
    const downloaded = await download(entry.repo);
    if (!downloaded) return false;
    tj = downloaded.tj;
    tc = downloaded.tc;
  }

  try {
    const tokenizer = new Tokenizer(tj as TokenizerArgs[0], tc as TokenizerArgs[1]);
    tokenizer.encode("probe"); // sanity-check a corrupt cache can't slip through
    loaded.set(model, tokenizer);
    return true;
  } catch {
    return false;
  }
}

/** Ensure exact tokenizers for every HF-capable model in `models`. */
export async function ensureTokenizers(
  models: readonly string[],
  opts: EnsureOptions = {},
): Promise<void> {
  for (const model of models) {
    if (hasHfTokenizer(model)) {
      await ensureTokenizer(model, opts);
    }
  }
}

/** Test helper: drop all in-memory tokenizers. */
export function resetHfTokenizers(): void {
  loaded.clear();
}
