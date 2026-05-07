#!/usr/bin/env tsx
/**
 * Validates all card JSON files under src/cards/data/.
 *
 * Run with:
 *   pnpm cards:check        # from repo root
 *   pnpm cards:check        # from packages/card-engine/
 *
 * Exits 0 on success, 1 on any validation error. Prints friendly
 * per-card messages so non-engineers can identify and fix issues.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  UnitsFile,
  WeaponsFile,
  ItemsFile,
  SupportsFile,
  TacticsFile,
  formatZodIssues,
} from "../src/cards/schema.js";
import { validateCardData } from "../src/cards/validate.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, "..", "src", "cards", "data");

const files = [
  { name: "units.json", schema: UnitsFile },
  { name: "weapons.json", schema: WeaponsFile },
  { name: "items.json", schema: ItemsFile },
  { name: "supports.json", schema: SupportsFile },
  { name: "tactics.json", schema: TacticsFile },
] as const;

let hasError = false;
const allParsed: unknown[] = [];

for (const { name, schema } of files) {
  const path = resolve(dataDir, name);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    console.error(`✗ ${name}: cannot read (${(e as Error).message})`);
    hasError = true;
    continue;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`✗ ${name}: invalid JSON — ${(e as Error).message}`);
    console.error(`   Check for a trailing comma, missing quote, or unmatched brace.`);
    hasError = true;
    continue;
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const lines = formatZodIssues(name, parsed, result.error);
    for (const line of lines) console.error(`✗ ${line}`);
    hasError = true;
    continue;
  }

  console.log(`✓ ${name}: ${result.data.length} cards`);
  allParsed.push(...(result.data as unknown[]));
}

if (!hasError) {
  try {
    validateCardData(allParsed as Parameters<typeof validateCardData>[0]);
    console.log("✓ semantic checks: duplicate ids, HP consistency, stat bounds");
  } catch (e) {
    console.error(`\n${(e as Error).message}`);
    hasError = true;
  }
}

// Art files live at packages/client/public/cards/<id>.png. We don't require
// every card to have art, but every PNG under that directory must map to a
// known card id so renames/typos surface at build time.
const artDir = resolve(here, "..", "..", "client", "public", "cards");
if (!hasError && existsSync(artDir)) {
  const cardIds = new Set(
    (allParsed as Array<{ id: string }>).map((c) => c.id),
  );
  const pngs = readdirSync(artDir).filter((f) => f.endsWith(".png"));
  const orphans = pngs.filter((f) => !cardIds.has(f.replace(/\.png$/, "")));
  if (orphans.length > 0) {
    console.error(
      `✗ art: ${orphans.length} orphan file(s) in public/cards/ not matching any card id:`,
    );
    for (const o of orphans) console.error(`   ${o}`);
    hasError = true;
  } else {
    const withArt = pngs.length;
    console.log(`✓ art: ${withArt} PNG(s) in public/cards/ match card ids`);
  }
}

if (hasError) {
  console.error("\nFix the issues above, then re-run `pnpm cards:check`.");
  process.exit(1);
}

console.log("\nAll card data is valid.");
