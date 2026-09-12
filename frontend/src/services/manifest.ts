import type { ThemeManifest } from '../contracts';
import { assetUrl } from '../theme/themeConfig';
import { TASK_HOLD_REQUIRED_MS, TASK_WINDOW_MS, TRAINING_DURATION_MS, TRAINING_POSES, TRAINING_TASK_COUNT } from './trainingRules';

export function validateManifest(value: unknown): ThemeManifest {
  const fail = () => { throw new Error('训练资源版本不匹配，请稍后重试。'); };
  if (!value || typeof value !== 'object') return fail();
  const source = value as Record<string, unknown>;
  if (source.protocolId !== 'tendon-a-demo-v1' || source.version === undefined || source.bpm !== 60 ||
      source.durationMs !== TRAINING_DURATION_MS || source.windowMs !== TASK_WINDOW_MS ||
      source.holdRequiredMs !== TASK_HOLD_REQUIRED_MS || source.rounds !== 10 ||
      JSON.stringify(source.pattern) !== JSON.stringify(TRAINING_POSES)) return fail();
  const id = typeof source.id === 'string' ? source.id : fail();
  const title = typeof source.title === 'string' ? source.title : fail();
  const version = typeof source.version === 'string' ? source.version : fail();
  const tasks: ThemeManifest['tasks'] = Array.from({ length: TRAINING_TASK_COUNT }, (_, index) => ({
    id: `${id}-task-${String(index + 1).padStart(2, '0')}`,
    pose: TRAINING_POSES[index % TRAINING_POSES.length],
    startMs: index * TASK_WINDOW_MS,
    targetMs: index * TASK_WINDOW_MS,
    endMs: (index + 1) * TASK_WINDOW_MS,
    holdMs: TASK_HOLD_REQUIRED_MS,
  }));
  return { id, title, protocolId: 'tendon-a-demo-v1', version, bpm: 60, durationMs: TRAINING_DURATION_MS, tasks };
}
export async function loadManifest(themeId: string, signal?: AbortSignal) {
  const response = await fetch(assetUrl(`themes/${themeId}/manifest.json`), { signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('训练内容还没有准备好，请稍后再来。');
  const manifest = validateManifest(await response.json());
  if (manifest.id !== themeId) throw new Error('训练资源版本不匹配，请稍后重试。');
  return manifest;
}
