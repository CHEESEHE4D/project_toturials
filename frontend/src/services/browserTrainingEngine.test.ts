import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecognitionState, ThemeManifest, TrainingSnapshot } from '../contracts';
import { BrowserTrainingEngine } from './browserTrainingEngine';
import { validateManifest } from './manifest';

class FakeRecognition {
  private listener?: (state: RecognitionState) => void;
  async requestCamera() { return {} as MediaStream; }
  subscribe(listener: (state: RecognitionState) => void) { this.listener = listener; listener({ tracking: 'LOST', pose: 'UNKNOWN', stableForMs: 0 }); return () => {}; }
  startTutorialPose() {}
  finishTutorialPose() {}
  stop() {}
  emit(state: RecognitionState) { this.listener?.(state); }
}

class FakeVideo {
  src = '';
  muted = true;
  loop = true;
  preload = 'none';
  currentTime = 0;
  async play() {}
  pause() {}
}

class FakeAudio {
  src = '/audio/pet.mp3';
  loop = true;
  preload = 'none';
  volume = 1;
  currentTime = 0;
  play = vi.fn(async () => {});
  pause = vi.fn();
}

function manifest(): ThemeManifest {
  return validateManifest({ id: 'pet', title: '萌宠互动', protocolId: 'tendon-a-demo-v1', version: 'timeline-v2', bpm: 60, durationMs: 90_000, windowMs: 3_000, holdRequiredMs: 2_000, rounds: 10, pattern: ['STRAIGHT', 'HOOK', 'FIST'] });
}

describe('browser training engine', () => {
  let raf: FrameRequestCallback | undefined;
  let hidden = false;

  beforeEach(() => {
    vi.useFakeTimers();
    const eventTarget = new EventTarget();
    Object.defineProperty(eventTarget, 'hidden', { get: () => hidden });
    vi.stubGlobal('document', eventTarget);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { raf = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); hidden = false; raf = undefined; });

  it('keeps rhythm and cumulative hold separate, settles once, and replays after lost tracking', async () => {
    const recognition = new FakeRecognition();
    const engine = new BrowserTrainingEngine(recognition, () => {});
    const snapshots: TrainingSnapshot[] = [];
    engine.subscribe(snapshot => snapshots.push(snapshot));
    const audio = new FakeAudio();
    await engine.prepare({ media: new FakeVideo() as HTMLVideoElement, audio: audio as unknown as HTMLAudioElement, manifest: manifest() });

    const start = engine.start();
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.volume).toBe(0);
    await vi.advanceTimersByTimeAsync(3_000);
    await start;
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.volume).toBe(0.72);
    const base = performance.now();

    recognition.emit({ tracking: 'GOOD', pose: 'STRAIGHT', stableForMs: 1_000 });
    raf?.(base + 1_000);
    recognition.emit({ tracking: 'GOOD', pose: 'UNKNOWN', stableForMs: 500 });
    raf?.(base + 1_500);
    recognition.emit({ tracking: 'GOOD', pose: 'STRAIGHT', stableForMs: 1_000 });
    raf?.(base + 2_500);
    expect(snapshots.at(-1)?.holdCompleted).toBe(true);
    expect(snapshots.at(-1)?.confirmed.judged).toBe(0);

    raf?.(base + 3_010);
    raf?.(base + 3_100);
    expect(snapshots.at(-1)?.confirmed).toMatchObject({ completed: 1, judged: 1, perfect: 1, good: 0, miss: 0 });

    recognition.emit({ tracking: 'LOST', pose: 'UNKNOWN', stableForMs: 0 });
    await vi.advanceTimersByTimeAsync(500);
    expect(snapshots.at(-1)?.status).toBe('PAUSED');
    expect(snapshots.at(-1)?.pauseReason).toBe('HAND_LOST');
    expect(audio.pause).toHaveBeenCalled();

    recognition.emit({ tracking: 'GOOD', pose: 'HOOK', stableForMs: 1_000 });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(snapshots.at(-1)?.status).toBe('PLAYING');
    expect(snapshots.at(-1)?.mediaMs).toBe(3_000);
    expect(snapshots.at(-1)?.confirmed.judged).toBe(1);
    expect(audio.currentTime).toBe(3);
    engine.dispose();
  });

  it('finishes at 90 seconds with all 30 tasks settled even after a delayed frame', async () => {
    const recognition = new FakeRecognition();
    let completed = false;
    const engine = new BrowserTrainingEngine(recognition, () => { completed = true; });
    let latest: TrainingSnapshot | undefined;
    engine.subscribe(snapshot => { latest = snapshot; });
    await engine.prepare({ media: new FakeVideo() as HTMLVideoElement, manifest: manifest() });
    const start = engine.start();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3_000);
    await start;
    raf?.(performance.now() + 90_000);
    expect(completed).toBe(true);
    expect(latest?.status).toBe('COMPLETED');
    expect(latest?.mediaMs).toBe(90_000);
    expect(latest?.confirmed).toMatchObject({ judged: 30, completed: 0, miss: 30 });
    engine.dispose();
  });
});
