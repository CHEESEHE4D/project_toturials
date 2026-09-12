import { describe, expect, it } from 'vitest';
import { validateManifest } from './manifest';
import { advanceTaskAttempt, beginTaskAttempt, gradeArrival, TASK_HOLD_REQUIRED_MS, TASK_WINDOW_MS, TRAINING_POSES } from './trainingRules';

function source() {
  return {
    id: 'pet', title: '萌宠互动', protocolId: 'tendon-a-demo-v1', version: 'timeline-v2', bpm: 60,
    durationMs: 90_000, windowMs: 3_000, holdRequiredMs: 2_000, rounds: 10,
    pattern: ['STRAIGHT', 'HOOK', 'FIST'],
  };
}

describe('v2 training chart', () => {
  it('creates exactly ten fixed STRAIGHT-HOOK-FIST rounds', () => {
    const manifest = validateManifest(source());
    expect(manifest.tasks).toHaveLength(30);
    for (let index = 0; index < manifest.tasks.length; index += 1) {
      expect(manifest.tasks[index]).toMatchObject({
        pose: TRAINING_POSES[index % 3],
        startMs: index * TASK_WINDOW_MS,
        targetMs: index * TASK_WINDOW_MS,
        endMs: (index + 1) * TASK_WINDOW_MS,
        holdMs: TASK_HOLD_REQUIRED_MS,
      });
    }
    expect(manifest.tasks.at(-1)?.endMs).toBe(90_000);
  });

  it('applies the centralized rhythm windows at their exact boundaries', () => {
    expect(gradeArrival(300, 0)).toBe('PERFECT');
    expect(gradeArrival(301, 0)).toBe('GOOD');
    expect(gradeArrival(750, 0)).toBe('GOOD');
    expect(gradeArrival(751, 0)).toBe('MISS');
  });

  it('accumulates correct segments across UNKNOWN without crediting the gap', () => {
    let attempt = beginTaskAttempt(0);
    attempt = advanceTaskAttempt(attempt, { mediaMs: 1_000, taskStartMs: 0, targetMs: 0, correct: true, stableForMs: 1_000 });
    attempt = advanceTaskAttempt(attempt, { mediaMs: 1_500, taskStartMs: 0, targetMs: 0, correct: false, stableForMs: 500 });
    attempt = advanceTaskAttempt(attempt, { mediaMs: 2_500, taskStartMs: 0, targetMs: 0, correct: true, stableForMs: 1_000 });
    expect(attempt.accumulatedMs).toBe(2_000);
    expect(attempt.grade).toBe('PERFECT');
  });

  it('does not count a wrong pose and keeps the first arrival grade', () => {
    let attempt = beginTaskAttempt(3_000);
    attempt = advanceTaskAttempt(attempt, { mediaMs: 3_600, taskStartMs: 3_000, targetMs: 3_000, correct: true, stableForMs: 300 });
    attempt = advanceTaskAttempt(attempt, { mediaMs: 4_900, taskStartMs: 3_000, targetMs: 3_000, correct: false, stableForMs: 1_300 });
    expect(attempt.accumulatedMs).toBe(300);
    expect(attempt.grade).toBe('PERFECT');
  });
});
