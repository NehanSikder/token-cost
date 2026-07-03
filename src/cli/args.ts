/**
 * CLI argument parsing — pure and testable (no I/O).
 */
export interface ParsedArgs {
  readonly models: string[];
  readonly json: boolean;
  readonly verbose: boolean;
  readonly offline: boolean;
  readonly help: boolean;
  readonly version: boolean;
  /** Positional tokens joined with spaces. */
  readonly text: string;
  /** Unrecognized flags — the CLI errors on these. */
  readonly unknownFlags: string[];
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const models: string[] = [];
  const unknownFlags: string[] = [];
  const positional: string[] = [];
  let json = false;
  let verbose = false;
  let offline = false;
  let help = false;
  let version = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") help = true;
    else if (a === "-V" || a === "--version") version = true;
    else if (a === "--json") json = true;
    else if (a === "-v" || a === "--verbose") verbose = true;
    else if (a === "--offline") offline = true;
    else if (a === "-m" || a === "--model") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        models.push(next);
        i++;
      } else {
        unknownFlags.push(`${a} (missing value)`);
      }
    } else if (a.startsWith("--model=")) models.push(a.slice("--model=".length));
    else if (a.startsWith("-m=")) models.push(a.slice("-m=".length));
    else if (a.startsWith("-")) unknownFlags.push(a);
    else positional.push(a);
  }

  return {
    models,
    json,
    verbose,
    offline,
    help,
    version,
    text: positional.join(" "),
    unknownFlags,
  };
}
