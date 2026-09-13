export type Direction = -1 | 1;
export type Transition = { token: number; from: number; to: number; direction: Direction };

export const nextIndex = (index: number, delta: Direction) => (index + delta + 3) % 3;

export const swipeDirection = (dx: number, dy: number): -1 | 0 | 1 =>
  Math.abs(dx) >= 48 && Math.abs(dx) >= Math.abs(dy) * 1.25 ? (dx < 0 ? 1 : -1) : 0;

export function createSelectionGate(initial = 0) {
  let index = initial;
  let serial = 0;
  let pending: Transition | null = null;

  return {
    get: () => ({ index, pending }),
    begin(to: number): Transition | null {
      if (pending || !Number.isInteger(to) || to < 0 || to > 2 || to === index) return null;
      pending = {
        token: ++serial,
        from: index,
        to,
        direction: (to - index + 3) % 3 === 1 ? 1 : -1,
      };
      return pending;
    },
    finish(token: number) {
      if (pending?.token !== token) return false;
      index = pending.to;
      pending = null;
      return true;
    },
    cancel() {
      pending = null;
      serial += 1;
    },
  };
}
