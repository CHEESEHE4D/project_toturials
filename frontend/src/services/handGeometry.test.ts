import { describe, expect, it } from 'vitest';
import { classifyHandPose, jointAngle, mapHandToAura, trackingQuality, type HandPoint } from './handGeometry';

function straightHand(): HandPoint[] {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.75, z: 0 }));
  points[0] = { x: 0.5, y: 0.85, z: 0 };
  const xs = [0.3, 0.43, 0.57, 0.7];
  for (const [finger, x] of xs.entries()) {
    const base = 5 + finger * 4;
    points[base] = { x, y: 0.65, z: 0 };
    points[base + 1] = { x, y: 0.48, z: 0 };
    points[base + 2] = { x, y: 0.31, z: 0 };
    points[base + 3] = { x, y: 0.14, z: 0 };
  }
  return points;
}

function hookHand(): HandPoint[] {
  const points = straightHand();
  for (let finger = 0; finger < 4; finger += 1) {
    const base = 5 + finger * 4;
    const x = points[base].x;
    points[base + 1] = { x, y: 0.45, z: 0 };
    points[base + 2] = { x: x + 0.12, y: 0.45, z: 0 };
    points[base + 3] = { x: x + 0.12, y: 0.58, z: 0 };
  }
  return points;
}

function fistHand(): HandPoint[] {
  const points = straightHand();
  const wrist = points[0];
  for (let finger = 0; finger < 4; finger += 1) {
    const base = 5 + finger * 4;
    const mcp = points[base];
    const vx = wrist.x - mcp.x;
    const vy = wrist.y - mcp.y;
    const length = Math.hypot(vx, vy);
    const towardWrist = { x: vx / length, y: vy / length };
    const acrossPalm = { x: towardWrist.y, y: -towardWrist.x };
    points[base + 1] = { x: mcp.x + acrossPalm.x * 0.12, y: mcp.y + acrossPalm.y * 0.12, z: 0 };
    points[base + 2] = { x: points[base + 1].x + towardWrist.x * 0.12, y: points[base + 1].y + towardWrist.y * 0.12, z: 0 };
    points[base + 3] = { x: points[base + 2].x - acrossPalm.x * 0.08, y: points[base + 2].y - acrossPalm.y * 0.08, z: 0 };
  }
  return points;
}

describe('hand geometry', () => {
  it('measures a straight joint as 180 degrees', () => {
    expect(jointAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180);
  });

  it('recognizes a straight hand from 21 landmarks', () => {
    expect(classifyHandPose(straightHand())).toBe('STRAIGHT');
  });

  it('distinguishes hook and fist flexion patterns', () => {
    expect(classifyHandPose(hookHand())).toBe('HOOK');
    expect(classifyHandPose(fistHand())).toBe('FIST');
  });

  it('requires a complete, centered hand for good tracking', () => {
    expect(trackingQuality([])).toBe('LOST');
    expect(trackingQuality(straightHand())).toBe('GOOD');
    const clipped = straightHand().map(point => ({ ...point, x: point.x - 0.35 }));
    expect(trackingQuality(clipped)).toBe('ADJUST');
  });

  it('mirrors camera x coordinates when mapping to the training aura', () => {
    const landmarks = straightHand().map(point => ({ ...point, x: point.x - 0.1 }));
    expect(mapHandToAura(landmarks, 'GOOD').x).toBeGreaterThan(0.5);
  });
});
