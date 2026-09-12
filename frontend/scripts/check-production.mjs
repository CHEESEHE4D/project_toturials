import fs from 'node:fs/promises';
import path from 'node:path';
async function files(dir) { const entries = await fs.readdir(dir, { withFileTypes: true }); return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : path.join(dir, e.name)))).flat(); }
const assets = await files('dist');
const forbidden = ['MockTrainingEngine', 'design-preview-only', 'design-task-', '设计示例 · 未写入本机记录', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const file of assets.filter(f => /\.(html|js)$/.test(f))) {
  const source = await fs.readFile(file, 'utf8');
  for (const marker of forbidden) if (source.includes(marker)) throw new Error(`Production must not contain ${marker}: ${file}`);
}
console.log('PASS: no development simulator, fixture sessions or service-role key markers in production HTML/JS.');
