/**
 * Shared on-disk cache location for token-cost (pricing snapshots, tokenizer files).
 * Honors TOKEN_COST_CACHE_DIR, then XDG_CACHE_HOME, then ~/.cache.
 */
import { homedir } from "node:os";
import { join } from "node:path";

export function cacheDir(): string {
  const override = process.env["TOKEN_COST_CACHE_DIR"];
  if (override) return override;
  const xdg = process.env["XDG_CACHE_HOME"];
  return join(xdg ?? join(homedir(), ".cache"), "token-cost");
}
