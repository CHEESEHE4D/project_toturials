import type { Pose, TrackingQuality } from '../contracts';

export interface HandPoint {
  x: number;
  y: number;
  z?: number;
}

export interface HandAuraSample {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  tracking: TrackingQuality;
}

const FINGERS = [
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
] as const;

// Baseline thresholds are intentionally centralized so device testing can tune and version them.
export const HAND_POSE_THRESHOLDS = {
  straight: { mcpMin: 135, pipMin: 150, dipMin: 145 },
  hook: { mcpMin: 125, pipMax: 135, dipMax: 150 },
  fist: { mcpMax: 140, pipMax: 145, tipToPalmRatioMax: 1.55 },
  agreeingFingers: 3,
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: HandPoint, b: HandPoint) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

export function jointAngle(a: HandPoint, vertex: HandPoint, c: HandPoint) {
  const ab = { x: a.x - vertex.x, y: a.y - vertex.y, z: (a.z ?? 0) - (vertex.z ?? 0) };
  const cb = { x: c.x - vertex.x, y: c.y - vertex.y, z: (c.z ?? 0) - (vertex.z ?? 0) };
  const denominator = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  if (denominator < Number.EPSILON) return 0;
  const cosine = clamp((ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) / denominator, -1, 1);
  return Math.acos(cosine) * 180 / Math.PI;
}

export function classifyHandPose(landmarks: readonly HandPoint[]): Pose {
  if (landmarks.length < 21) return 'UNKNOWN';

  const measurements = FINGERS.map(([mcp, pip, dip, tip]) => ({
    mcp: jointAngle(landmarks[0], landmarks[mcp], landmarks[pip]),
    pip: jointAngle(landmarks[mcp], landmarks[pip], landmarks[dip]),
    dip: jointAngle(landmarks[pip], landmarks[dip], landmarks[tip]),
    tipToWrist: distance(landmarks[tip], landmarks[0]),
    mcpToWrist: distance(landmarks[mcp], landmarks[0]),
  }));

  const extended = measurements.filter(finger =>
    finger.mcp >= HAND_POSE_THRESHOLDS.straight.mcpMin &&
    finger.pip >= HAND_POSE_THRESHOLDS.straight.pipMin &&
    finger.dip >= HAND_POSE_THRESHOLDS.straight.dipMin,
  ).length;
  if (extended >= HAND_POSE_THRESHOLDS.agreeingFingers) return 'STRAIGHT';

  const hooked = measurements.filter(finger =>
    finger.mcp >= HAND_POSE_THRESHOLDS.hook.mcpMin &&
    finger.pip <= HAND_POSE_THRESHOLDS.hook.pipMax &&
    finger.dip <= HAND_POSE_THRESHOLDS.hook.dipMax,
  ).length;
  if (hooked >= HAND_POSE_THRESHOLDS.agreeingFingers) return 'HOOK';

  const folded = measurements.filter(finger =>
    finger.mcp <= HAND_POSE_THRESHOLDS.fist.mcpMax &&
    finger.pip <= HAND_POSE_THRESHOLDS.fist.pipMax &&
    finger.tipToWrist <= finger.mcpToWrist * HAND_POSE_THRESHOLDS.fist.tipToPalmRatioMax,
  ).length;
  if (folded >= HAND_POSE_THRESHOLDS.agreeingFingers) return 'FIST';

  return 'UNKNOWN';
}

export function trackingQuality(landmarks: readonly HandPoint[]): TrackingQuality {
  if (landmarks.length < 21) return 'LOST';
  const xs = landmarks.map(point => point.x);
  const ys = landmarks.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const centered = minX >= 0.025 && maxX <= 0.975 && minY >= 0.025 && maxY <= 0.975;
  const usefulSize = Math.max(width, height) >= 0.18 && Math.max(width, height) <= 0.92;
  return centered && usefulSize ? 'GOOD' : 'ADJUST';
}

export function mapHandToAura(landmarks: readonly HandPoint[], tracking: TrackingQuality): HandAuraSample {
  if (landmarks.length < 21) return { x: 0.5, y: 0.5, scale: 0.8, rotation: 0, tracking: 'LOST' };
  const xs = landmarks.map(point => point.x);
  const ys = landmarks.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const rotation = Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x) * 180 / Math.PI + 90;
  return {
    // The camera preview is mirrored, so stage coordinates must be mirrored too.
    x: clamp(1 - (minX + maxX) / 2, 0, 1),
    y: clamp((minY + maxY) / 2, 0, 1),
    scale: clamp(Math.max(maxX - minX, maxY - minY) / 0.55, 0.55, 1.5),
    rotation,
    tracking,
  };
}
