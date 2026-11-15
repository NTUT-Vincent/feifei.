import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readEdition } from '../lib/daily/loader.ts';
const root = join(process.cwd(), 'content');
try {
  const current = readEdition(root);
  if (Date.parse(current.layout.editedAt) > Date.now() + 5 * 60_000) throw new Error('Edition timestamp is in the future');
  for (const entry of readdirSync(join(root, 'archive'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const archived = readEdition(join(root, 'archive', entry.name));
    if (archived.layout.date !== entry.name) throw new Error(`Archive date mismatch: ${entry.name}`);
  }
  console.log(`Daily edition ${current.layout.date}: ${current.layout.sections.length} sections validated.`);
} catch (error) {
  console.error('Daily edition validation failed:', error.message);
  process.exitCode = 1;
}
