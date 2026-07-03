import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { refreshPricing, isValidSnapshot, isOffline, type RawSnapshot } from "./refresh.js";
import { activatePricing, getPricing, resetPricing } from "./pricing.js";

const SNAPSHOT: RawSnapshot = {
  as_of: "2099-01-01",
  source: "test",
  unit: "usd_per_million_tokens",
  models: { "gpt-4o": { input: 2.5, output: 10, context: 128000, provider: "openai" } },
};

let dir: string;

function seedCache(snapshot: RawSnapshot, meta: { etag: string | null; fetchedAt: number }): void {
  writeFileSync(join(dir, "pricing.json"), JSON.stringify(snapshot));
  writeFileSync(join(dir, "pricing.meta.json"), JSON.stringify(meta));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "token-cost-test-"));
  process.env["TOKEN_COST_CACHE_DIR"] = dir;
});

afterEach(() => {
  delete process.env["TOKEN_COST_CACHE_DIR"];
  delete process.env["TOKEN_COST_OFFLINE"];
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  resetPricing();
});

describe("refreshPricing", () => {
  it("uses a fresh cache without touching the network", async () => {
    seedCache(SNAPSHOT, { etag: '"abc"', fetchedAt: Date.now() });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await refreshPricing();
    expect(result.source).toBe("cache-fresh");
    expect(result.snapshot?.as_of).toBe("2099-01-01");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the ETag and keeps the cache on 304", async () => {
    seedCache(SNAPSHOT, { etag: '"abc"', fetchedAt: 0 }); // long stale
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await refreshPricing();
    expect(result.source).toBe("not-modified");
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({ "if-none-match": '"abc"' });
    // 304 must bump fetchedAt so the next run is a cache hit again
    const meta = JSON.parse(readFileSync(join(dir, "pricing.meta.json"), "utf8"));
    expect(meta.fetchedAt).toBeGreaterThan(0);
  });

  it("downloads and caches a new snapshot on 200", async () => {
    const fresh = { ...SNAPSHOT, as_of: "2099-06-01" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(fresh), { status: 200, headers: { etag: '"v2"' } }),
      ),
    );

    const result = await refreshPricing();
    expect(result.source).toBe("downloaded");
    expect(result.snapshot?.as_of).toBe("2099-06-01");
    const cached = JSON.parse(readFileSync(join(dir, "pricing.json"), "utf8"));
    expect(cached.as_of).toBe("2099-06-01");
  });

  it("falls back to a stale cache when the network fails", async () => {
    seedCache(SNAPSHOT, { etag: null, fetchedAt: 0 });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));

    const result = await refreshPricing();
    expect(result.source).toBe("cache-stale");
    expect(result.snapshot?.as_of).toBe("2099-01-01");
  });

  it("falls back to bundled when there is no cache and no network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await refreshPricing();
    expect(result.source).toBe("bundled");
    expect(result.snapshot).toBeNull();
  });

  it("never fetches in offline mode", async () => {
    seedCache(SNAPSHOT, { etag: null, fetchedAt: 0 });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await refreshPricing({ offline: true });
    expect(result.source).toBe("offline");
    expect(result.snapshot?.as_of).toBe("2099-01-01");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload and falls back", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"garbage":true}', { status: 200 })),
    );
    const result = await refreshPricing();
    expect(result.source).toBe("bundled");
  });
});

describe("isValidSnapshot", () => {
  it("accepts the real shape and rejects junk", () => {
    expect(isValidSnapshot(SNAPSHOT)).toBe(true);
    expect(isValidSnapshot(null)).toBe(false);
    expect(isValidSnapshot({ as_of: "2025-01-01" })).toBe(false);
    expect(isValidSnapshot({ as_of: "x", models: { m: { input: "NaN" } } })).toBe(false);
  });
});

describe("isOffline", () => {
  it("honors the flag and the env var", () => {
    expect(isOffline(["--offline"])).toBe(true);
    process.env["TOKEN_COST_OFFLINE"] = "1";
    expect(isOffline([])).toBe(true);
  });
});

describe("activatePricing", () => {
  it("swaps in a newer snapshot and exposes it via getPricing", () => {
    const activated = activatePricing({
      as_of: "2099-12-31",
      source: "test",
      unit: "usd_per_million_tokens",
      models: { "gpt-4o": { input: 99, output: 99, context: null, provider: null } },
    });
    expect(activated).toBe(true);
    expect(getPricing().asOf).toBe("2099-12-31");
    expect(getPricing().models["gpt-4o"]?.input).toBe(99);
  });

  it("refuses to downgrade to an older snapshot", () => {
    const bundledAsOf = getPricing().asOf;
    const activated = activatePricing({
      as_of: "2000-01-01",
      source: "old",
      unit: "usd_per_million_tokens",
      models: {},
    });
    expect(activated).toBe(false);
    expect(getPricing().asOf).toBe(bundledAsOf);
  });
});
