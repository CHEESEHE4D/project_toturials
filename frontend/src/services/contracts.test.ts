import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { validateManifest } from './manifest';
import { summaryMetrics } from './summaryMetrics';
import { sessionRepository } from './sessionRepository';
import type { SessionSummary } from '../contracts';

function manifest() { return { id: 'pet', title: '萌宠互动', protocolId: 'tendon-a-demo-v1', version: 'timeline-v2', bpm: 60, durationMs: 90000, windowMs: 3000, holdRequiredMs: 2000, rounds: 10, pattern: ['STRAIGHT', 'HOOK', 'FIST'] }; }
const result: SessionSummary = { id: 'contract-test', themeId: 'pet', protocolId: 'tendon-a-demo-v1', manifestVersion: '1', ruleVersion: '1', status: 'ABORTED', plannedTasks: 15, completedTasks: 5, perfect: 3, good: 2, miss: 0, judgedTasks: 5, activeDurationMs: 31000, plannedDurationMs: 90000, startedAt: '2026-09-12T04:00:00Z', endedAt: '2026-09-12T04:00:31Z', syncState: 'LOCAL_ONLY' };
describe('asset contract validation', () => {
  it('accepts the 90 second / 30 task v2 contract', () => expect(validateManifest(manifest()).tasks).toHaveLength(30));
  it.each(['window', 'hold', 'rounds', 'duration', 'pose-order'])('rejects invalid %s without entering training', mutation => {
    const m = manifest();
    if (mutation === 'window') m.windowMs = 6000;
    if (mutation === 'hold') m.holdRequiredMs = 3000;
    if (mutation === 'rounds') m.rounds = 5;
    if (mutation === 'duration') m.durationMs = 89000;
    if (mutation === 'pose-order') m.pattern = ['STRAIGHT', 'FIST', 'HOOK'];
    expect(() => validateManifest(m)).toThrow('训练资源版本不匹配');
  });
});
describe('confirmed summary display', () => {
  it('keeps an old record on its own 15-task denominator', () => { expect(summaryMetrics(result)).toEqual({ completion: 33, rhythm: 84 }); expect(result.plannedTasks).toBe(15); });
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
  it('stores a v2 30-task record without rewriting old records', async () => {
    const modern = { ...result, id: 'contract-v2', manifestVersion: 'timeline-v2', ruleVersion: 'timeline-3s-hold2s-v2', plannedTasks: 30, completedTasks: 24, judgedTasks: 30, perfect: 18, good: 8, miss: 4 };
    await sessionRepository.save(modern);
    expect((await sessionRepository.get(modern.id))?.plannedTasks).toBe(30);
    expect((await sessionRepository.get(result.id))?.plannedTasks).toBe(15);
  });
  it('does not invent a missing result', async () => expect(await sessionRepository.get('missing')).toBeNull());
});
