import type { ThemeManifest } from '../contracts';
import { assetUrl } from '../theme/themeConfig';

export function validateManifest(value: unknown): ThemeManifest {
  const fail = () => { throw new Error('训练资源版本不匹配，请稍后重试。'); };
  if (!value || typeof value !== 'object') return fail();
  const m = value as ThemeManifest;
  if (m.protocolId !== 'tendon-a-demo-v1' || m.durationMs !== 90000 || m.bpm !== 60 || !m.videoUrl || !m.posterUrl || !m.version || !Array.isArray(m.tasks) || m.tasks.length !== 15) return fail();
  const ids = new Set<string>();
  m.tasks.forEach((task, i) => {
    if (!task || ids.has(task.id) || !task.id || !['STRAIGHT', 'HOOK', 'FIST'].includes(task.pose) ||
      task.startMs !== i * 6000 || task.targetMs !== task.startMs + 2000 || task.endMs !== (i + 1) * 6000 || task.holdMs !== 3000) fail();
    ids.add(task.id);
  });
  return m;
}
export async function loadManifest(themeId: string, signal?: AbortSignal) {
  const response = await fetch(assetUrl(`themes/${themeId}/manifest.json`), { signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('训练内容还没有准备好，请稍后再来。');
  const manifest = validateManifest(await response.json());
  if (manifest.id !== themeId) throw new Error('训练资源版本不匹配，请稍后重试。');
  return manifest;
}
