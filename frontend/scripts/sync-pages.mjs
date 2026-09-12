import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(projectRoot, 'dist');
const target = path.resolve(projectRoot, '..', 'docs', 'app');

await mkdir(target, { recursive: true });
// Deliberately do not delete old hashed assets: cached HTML may still reference them for up to ten minutes.
await cp(source, target, { recursive: true, force: true });
console.log(`Synced ${source} to ${target} while preserving previous hashed assets.`);
