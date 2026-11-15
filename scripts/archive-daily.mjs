import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentFiles, readEdition } from '../lib/daily/loader.ts';
const root = join(process.cwd(), 'content');
const edition = readEdition(root);
const target = join(root, 'archive', edition.layout.date);
// Never overwrite an existing dated edition with different content.
if (existsSync(target)) {
  for (const name of contentFiles) if (readFileSync(join(root, `${name}.json`), 'utf8') !== readFileSync(join(target, `${name}.json`), 'utf8')) throw new Error(`Archive already exists with different content: ${target}`);
} else {
  mkdirSync(target, { recursive: true });
  for (const name of contentFiles) writeFileSync(join(target, `${name}.json`), readFileSync(join(root, `${name}.json`)));
}
console.log(`Archived ${edition.layout.date}`);
