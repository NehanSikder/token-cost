/**
 * Pricing loader.
 *
 * Reads the bundled snapshot (src/core/pricing/pricing.json), which esbuild inlines
 * into the build — no runtime file lookup. Costs are USD per 1M tokens. In v1.1 this
 * is where a runtime URL refresh (TTL + ETag + offline fallback) will layer on top of
 * the bundled snapshot; see brainstorm/architecture.md section 6.
 */
import snapshot from "./pricing.json";

export interface ModelPricing {
  /** USD per 1M input tokens. */
  readonly input: number;
  /** USD per 1M output tokens. */
  readonly output: number;
  /** Max input context window, if known. */
  readonly context: number | null;
  /** Upstream provider label from the source. */
  readonly provider: string | null;
}

export interface PricingTable {
  /** ISO date the snapshot was generated. */
  readonly asOf: string;
  readonly source: string;
  readonly unit: string;
  readonly models: Readonly<Record<string, ModelPricing>>;
}

const BUNDLED: PricingTable = {
  asOf: snapshot.as_of,
  source: snapshot.source,
  unit: snapshot.unit,
  models: snapshot.models as Record<string, ModelPricing>,
};

/**
 * The table reads resolve against. Starts as the bundled snapshot; a runtime
 * refresh may swap in a newer one (whole-table replacement, never mutation).
 */
let active: PricingTable = BUNDLED;

/** Raw snapshot shape accepted from the refresh path (same as pricing.json). */
export interface RawPricingSnapshot {
  readonly as_of: string;
  readonly source: string;
  readonly unit: string;
  readonly models: Readonly<Record<string, ModelPricing>>;
}

/**
 * Activate a refreshed snapshot. Ignores snapshots older than (or equal to)
 * the one already active, so a stale cache can never downgrade fresher data.
 * Returns true when the snapshot was activated.
 */
export function activatePricing(raw: RawPricingSnapshot): boolean {
  if (raw.as_of <= active.asOf) return false; // ISO dates compare lexically
  active = {
    asOf: raw.as_of,
    source: raw.source,
    unit: raw.unit,
    models: raw.models,
  };
  return true;
}

/** Restore the bundled snapshot (used by tests). */
export function resetPricing(): void {
  active = BUNDLED;
}

/** The whole table (includes the `asOf` date for the "prices as of" badge). */
export function getPricing(): PricingTable {
  return active;
}

/** Pricing for one model, or undefined if we don't carry it. */
export function pricingFor(model: string): ModelPricing | undefined {
  return active.models[model];
}

/** All model ids we carry pricing for (the curated default comparison set). */
export function listModels(): string[] {
  return Object.keys(active.models);
}
