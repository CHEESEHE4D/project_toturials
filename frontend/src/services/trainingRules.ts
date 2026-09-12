import type { Grade } from '../contracts';

export const TRAINING_RULE_VERSION = 'timeline-3s-hold2s-v2';
export const TRAINING_DURATION_MS = 90_000;
export const TASK_WINDOW_MS = 3_000;
export const TASK_HOLD_REQUIRED_MS = 2_000;
export const TRAINING_TASK_COUNT = 30;
export const TRAINING_POSES = ['STRAIGHT', 'HOOK', 'FIST'] as const;
export const POSE_DEBOUNCE_MS = 200;
export const HAND_LOST_PAUSE_MS = 500;
export const HAND_RECOVERY_STABLE_MS = 1000;
// Engineering defaults for on-site tuning. These values are not clinically validated.
export const RHYTHM_WINDOWS_MS = { perfect: 300, good: 750 } as const;

export function gradeArrival(arrivalMs: number, targetMs: number): Grade {
  const offset = Math.abs(arrivalMs - targetMs);
  if (offset <= RHYTHM_WINDOWS_MS.perfect) return 'PERFECT';
  if (offset <= RHYTHM_WINDOWS_MS.good) return 'GOOD';
  return 'MISS';
}

export interface TaskAttempt {
  arrivalMs?: number;
  grade?: Grade;
  accumulatedMs: number;
  lastMediaMs: number;
}

export function beginTaskAttempt(startMs: number): TaskAttempt {
  return { accumulatedMs: 0, lastMediaMs: startMs };
}

/** Accumulates confirmed-correct time while preserving earlier segments across wrong/UNKNOWN samples. */
export function advanceTaskAttempt(attempt: TaskAttempt, input: {
  mediaMs: number;
  taskStartMs: number;
  targetMs: number;
  correct: boolean;
  stableForMs: number;
}): TaskAttempt {
  const next = { ...attempt, lastMediaMs: input.mediaMs };
  if (!input.correct || input.stableForMs < POSE_DEBOUNCE_MS) return next;
  if (next.arrivalMs === undefined) {
    next.arrivalMs = Math.max(input.taskStartMs, input.mediaMs - input.stableForMs);
    next.grade = gradeArrival(next.arrivalMs, input.targetMs);
    next.accumulatedMs += Math.max(0, input.mediaMs - next.arrivalMs);
  } else {
    next.accumulatedMs += Math.max(0, input.mediaMs - attempt.lastMediaMs);
  }
  return next;
}
