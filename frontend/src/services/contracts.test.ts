import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { validateManifest } from './manifest';
import { summaryMetrics } from './summaryMetrics';
import { sessionRepository } from './sessionRepository';
import type { SessionSummary } from '../contracts';

function manifest() { return { id: 'pet', title: '萌宠互动', protocolId: 'tendon-a-demo-v1', version: '1.0', bpm: 60, videoUrl: '/themes/pet/training.mp4', posterUrl: '/themes/pet/poster.jpg', durationMs: 90000, tasks: Array.from({ length: 15 }, (_, i) => ({ id: `task-${i}`, pose: ['STRAIGHT', 'HOOK', 'FIST'][i % 3], startMs: i * 6000, targetMs: i * 6000 + 2000, endMs: (i + 1) * 6000, holdMs: 3000 })) }; }
const result: SessionSummary = { id: 'contract-test', themeId: 'pet', protocolId: 'tendon-a-demo-v1', manifestVersion: '1', ruleVersion: '1', status: 'ABORTED', plannedTasks: 15, completedTasks: 5, perfect: 3, good: 2, miss: 0, judgedTasks: 5, activeDurationMs: 31000, plannedDurationMs: 90000, startedAt: '2026-09-12T04:00:00Z', endedAt: '2026-09-12T04:00:31Z', syncState: 'LOCAL_ONLY' };
describe('asset contract validation', () => {
  it('accepts the 90 second / 15 task contract', () => expect(validateManifest(manifest()).tasks).toHaveLength(15));
  it.each(['count', 'overlap', 'beat', 'duplicate', 'hold', 'duration', 'pose'])('rejects invalid %s without entering training', mutation => {
    const m = manifest();
    if (mutation === 'count') m.tasks.pop();
    if (mutation === 'overlap') m.tasks[1].startMs = 5900;
    if (mutation === 'beat') m.tasks[1].targetMs = 9000;
    if (mutation === 'duplicate') m.tasks[1].id = m.tasks[0].id;
    if (mutation === 'hold') m.tasks[1].holdMs = 2000;
    if (mutation === 'duration') m.durationMs = 89000;
    if (mutation === 'pose') m.tasks[1].pose = 'UNKNOWN';
    expect(() => validateManifest(m)).toThrow('训练资源版本不匹配');
  });
});
describe('confirmed summary display', () => {
  it('keeps action denominator at 15 for aborted sessions and does not add misses', () => { expect(summaryMetrics(result)).toEqual({ completion: 33, rhythm: 84 }); expect(result.miss).toBe(0); });
  it('shows no rhythm score for zero judged tasks', () => expect(summaryMetrics({ ...result, judgedTasks: 0, perfect: 0, good: 0 }).rhythm).toBeNull());
});
describe('IndexedDB repository', () => {
  it('commits completed and aborted records locally and emits only after save', async () => {
    let changes = 0; const unwatch = sessionRepository.watch(() => changes++);
    await sessionRepository.save(result);
    expect(await sessionRepository.get(result.id)).toEqual(result);
    await sessionRepository.save({ ...result, id: 'contract-complete', status: 'COMPLETED', startedAt: '2026-09-12T05:00:00Z' });
    expect((await sessionRepository.list())[0].id).toBe('contract-complete'); expect(changes).toBe(2); unwatch();
  });
  it('preserves a local result through a sync failure without duplicating it', async () => {
    await sessionRepository.save({ ...result, syncState: 'FAILED' });
    expect((await sessionRepository.get(result.id))?.syncState).toBe('FAILED');
    expect((await sessionRepository.list()).filter(s => s.id === result.id)).toHaveLength(1);
  });
  it('does not invent a missing result', async () => expect(await sessionRepository.get('missing')).toBeNull());
});
