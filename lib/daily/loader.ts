import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { editionSchema, type DailyEdition } from "./schema.ts";

export const contentFiles = ["layout", "news", "jokes", "stories", "mood"] as const;
export function readEdition(directory: string): DailyEdition {
  const value = Object.fromEntries(contentFiles.map((name) => [name, JSON.parse(readFileSync(join(directory, `${name}.json`), "utf8"))]));
  return editionSchema.parse(value);
}
export function loadDailyEdition(directory = join(process.cwd(), "content")): DailyEdition | null {
  try { return readEdition(directory); } catch { /* Try the newest valid archive without mixing editions. */ }
  try {
    const dates = readdirSync(join(directory, "archive")).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort().reverse();
    for (const date of dates) {
      try { return readEdition(join(directory, "archive", date)); } catch { /* Continue to the previous complete edition. */ }
    }
  } catch { /* No archive yet. The rest of the homepage stays usable. */ }
  return null;
}
