/**
 * Runtime pricing auto-refresh (v1.1 — brainstorm/architecture.md §6).
 *
 * Data ships on a URL, decoupled from npm releases. Strategy per invocation:
 *
 *   1. cached copy newer than TTL      -> use it, zero network
 *   2. cache stale                     -> conditional GET (ETag)
 *        304 -> bump cache timestamp, use cache (~free)
 *        200 -> write new cache, use it
 *   3. network down / URL unavailable  -> stale cache, else bundled snapshot
 *
 * Never blocks the user on failure and never throws: the bundled snapshot is
 * always a valid last resort. CI pins with --offline / TOKEN_COST_OFFLINE=1.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Raw pricing snapshot shape (matches pricing.json / build-pricing.mjs output). */
export interface RawSnapshot {
  readonly as_of: string;
  readonly source: string;
  readonly unit: string;
  readonly models: Readonly<
    Record<
      string,
      {
        readonly input: number;
        readonly output: number;
        readonly context: number | null;
        readonly provider: string | null;
      }
    >
  >;
}

interface CacheMeta {
  readonly etag: string | null;
  readonly fetchedAt: number; // epoch ms
}

export type RefreshSource = "cache-fresh" | "not-modified" | "downloaded" | "cache-stale" | "bundled" | "offline";

export interface RefreshResult {
  readonly snapshot: RawSnapshot | null; // null -> caller keeps the bundled snapshot
  readonly source: RefreshSource;
}

const DEFAULT_URL =
  "https://raw.githubusercontent.com/NehanSikder/token-cost/main/src/core/pricing/pricing.json";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // one refresh check per day
const FETCH_TIMEOUT_MS = 3_000; // a pricing refresh must never feel like a hang

export function pricingUrl(): string {
  return process.env["TOKEN_COST_PRICING_URL"] ?? DEFAULT_URL;
}

export function cacheDir(): string {
  const override = process.env["TOKEN_COST_CACHE_DIR"];
  if (override) return override;
  const xdg = process.env["XDG_CACHE_HOME"];
  return join(xdg ?? join(homedir(), ".cache"), "token-cost");
}

export function isOffline(argvFlags: readonly string[] = []): boolean {
  return argvFlags.includes("--offline") || process.env["TOKEN_COST_OFFLINE"] === "1";
}

const snapshotPath = (): string => join(cacheDir(), "pricing.json");
const metaPath = (): string => join(cacheDir(), "pricing.meta.json");

/** A minimal structural check so a corrupt/foreign payload can't poison the cache. */
export function isValidSnapshot(value: unknown): value is RawSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v["as_of"] !== "string") return false;
  if (typeof v["models"] !== "object" || v["models"] === null) return false;
  const models = v["models"] as Record<string, unknown>;
  return Object.values(models).every((m) => {
    if (typeof m !== "object" || m === null) return false;
    const mm = m as Record<string, unknown>;
    return typeof mm["input"] === "number" && typeof mm["output"] === "number";
  });
}

function readCache(): { snapshot: RawSnapshot; meta: CacheMeta } | null {
  try {
    const snapshot: unknown = JSON.parse(readFileSync(snapshotPath(), "utf8"));
    const meta = JSON.parse(readFileSync(metaPath(), "utf8")) as CacheMeta;
    if (!isValidSnapshot(snapshot) || typeof meta.fetchedAt !== "number") return null;
    return { snapshot, meta };
  } catch {
    return null; // missing or corrupt cache is simply "no cache"
  }
}

function writeCache(snapshot: RawSnapshot, etag: string | null): void {
  try {
    mkdirSync(cacheDir(), { recursive: true });
    writeFileSync(snapshotPath(), JSON.stringify(snapshot, null, 2));
    writeFileSync(metaPath(), JSON.stringify({ etag, fetchedAt: Date.now() } satisfies CacheMeta));
  } catch {
    // A read-only or full disk must not break the CLI; next run just re-fetches.
  }
}

function touchCache(existing: CacheMeta): void {
  try {
    writeFileSync(
      metaPath(),
      JSON.stringify({ etag: existing.etag, fetchedAt: Date.now() } satisfies CacheMeta),
    );
  } catch {
    // same rationale as writeCache
  }
}

/**
 * Resolve the freshest pricing snapshot available under the rules above.
 * Returns `snapshot: null` when the caller should keep the bundled data.
 */
export async function refreshPricing(
  opts: { offline?: boolean; ttlMs?: number; now?: number } = {},
): Promise<RefreshResult> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = opts.now ?? Date.now();
  const cached = readCache();

  if (opts.offline) {
    return cached
      ? { snapshot: cached.snapshot, source: "offline" }
      : { snapshot: null, source: "offline" };
  }

  if (cached && now - cached.meta.fetchedAt < ttl) {
    return { snapshot: cached.snapshot, source: "cache-fresh" };
  }

  try {
    const headers: Record<string, string> = {};
    if (cached?.meta.etag) headers["if-none-match"] = cached.meta.etag;

    const res = await fetch(pricingUrl(), {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.status === 304 && cached) {
      touchCache(cached.meta);
      return { snapshot: cached.snapshot, source: "not-modified" };
    }

    if (res.ok) {
      const body: unknown = await res.json();
      if (isValidSnapshot(body)) {
        writeCache(body, res.headers.get("etag"));
        return { snapshot: body, source: "downloaded" };
      }
    }
    // Non-OK (404 on a private repo, 5xx, …) or invalid payload: fall through.
  } catch {
    // Timeout / DNS / no network: fall through.
  }

  return cached
    ? { snapshot: cached.snapshot, source: "cache-stale" }
    : { snapshot: null, source: "bundled" };
}
