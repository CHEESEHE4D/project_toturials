import { describe, expect, it } from 'vitest';
import { createSelectionGate, nextIndex, swipeDirection } from './selection';

describe('theme selection', () => {
  it('wraps in both directions', () => {
    expect(nextIndex(2, 1)).toBe(0);
    expect(nextIndex(0, -1)).toBe(2);
  });
  it('only accepts deliberate horizontal swipes', () => {
    expect(swipeDirection(-47, 0)).toBe(0);
    expect(swipeDirection(-70, 80)).toBe(0);
    expect(swipeDirection(-60, 10)).toBe(1);
    expect(swipeDirection(60, 10)).toBe(-1);
  });
  it('locks repeated input until the active transition commits', () => {
    const gate = createSelectionGate();
    const transition = gate.begin(1)!;
    expect(gate.begin(2)).toBeNull();
    expect(gate.get().index).toBe(0);
    expect(gate.finish(transition.token)).toBe(true);
    expect(gate.get()).toEqual({ index: 1, pending: null });
  });
  it('rejects stale completion after cancellation and restart', () => {
    const gate = createSelectionGate();
    const old = gate.begin(1)!;
    gate.cancel();
    const current = gate.begin(2)!;
    expect(current.direction).toBe(-1);
    expect(gate.finish(old.token)).toBe(false);
    expect(gate.get().index).toBe(0);
    expect(gate.finish(current.token)).toBe(true);
    expect(gate.get().index).toBe(2);
  });
  it('ignores the active theme and invalid targets', () => {
    const gate = createSelectionGate();
    for (const index of [0, 3, -1, 1.5, Number.NaN]) expect(gate.begin(index)).toBeNull();
  });
});
