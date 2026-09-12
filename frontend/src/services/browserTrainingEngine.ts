import type {
  Grade,
  PauseReason,
  RecognitionController,
  RecognitionState,
  SessionSummary,
  ThemeManifest,
  TrainingEngine,
  TrainingSnapshot,
} from '../contracts';
import {
  advanceTaskAttempt,
  beginTaskAttempt,
  HAND_LOST_PAUSE_MS,
  HAND_RECOVERY_STABLE_MS,
  POSE_DEBOUNCE_MS,
  TASK_WINDOW_MS,
  TRAINING_RULE_VERSION,
  type TaskAttempt,
} from './trainingRules';

const EMPTY_COUNTS = { completed: 0, judged: 0, perfect: 0, good: 0, miss: 0 };

export class BrowserTrainingEngine implements TrainingEngine<HTMLVideoElement> {
  private readonly listeners = new Set<(snapshot: TrainingSnapshot) => void>();
  private readonly results = new Map<string, { grade: Grade; holdCompleted: boolean }>();
  private readonly unsubscribeRecognition: () => void;
  private media?: HTMLVideoElement;
  private audio?: HTMLAudioElement;
  private manifest?: ThemeManifest;
  private animationFrame?: number;
  private countdownTimer?: ReturnType<typeof setTimeout>;
  private countdownResolve?: () => void;
  private lostTimer?: ReturnType<typeof setTimeout>;
  private countdownEpoch = 0;
  private nonce = 0;
  private recognition: RecognitionState = { tracking: 'LOST', pose: 'UNKNOWN', stableForMs: 0 };
  private attempt: TaskAttempt = beginTaskAttempt(0);
  private timelineAnchor = 0;
  private lastAudioSyncMs = -Infinity;
  private startedAt?: string;
  private activeStartedAt?: number;
  private activeDurationMs = 0;
  private disposed = false;
  private completed = false;
  private lastPublishedAt = -Infinity;
  private snapshot: TrainingSnapshot = {
    status: 'PREPARING', mediaMs: 0, currentTaskIndex: 0, currentPose: 'STRAIGHT',
    tracking: 'LOST', recognizedPose: 'UNKNOWN', holdCompleted: false, holdProgress: 0,
    confirmed: { ...EMPTY_COUNTS },
  };

  constructor(
    recognition: RecognitionController<MediaStream>,
    private readonly onComplete: (summary: SessionSummary) => void,
  ) {
    this.unsubscribeRecognition = recognition.subscribe(state => this.handleRecognition(state));
  }

  async prepare({ media, audio, manifest }: { media: HTMLVideoElement; audio?: HTMLAudioElement; manifest: ThemeManifest }) {
    if (this.disposed) throw new Error('训练引擎已结束。');
    this.media = media;
    this.audio = audio;
    this.manifest = manifest;
    media.muted = true;
    media.loop = true;
    media.preload = 'metadata';
    if (audio) {
      audio.loop = false;
      audio.preload = 'auto';
      audio.volume = 0.72;
    }
    document.addEventListener('visibilitychange', this.handleVisibility);
    const firstTask = manifest.tasks[0];
    this.snapshot = {
      status: 'READY', mediaMs: 0, currentTaskIndex: 0, currentPose: firstTask.pose,
      nextPose: manifest.tasks[1]?.pose, groupPoses: manifest.tasks.slice(0, 3).map(task => task.pose),
      tracking: this.recognition.tracking, recognizedPose: this.recognition.pose,
      holdCompleted: false, holdProgress: 0, confirmed: { ...EMPTY_COUNTS },
    };
    this.publish();
  }

  subscribe(listener: (snapshot: TrainingSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.copySnapshot());
    return () => this.listeners.delete(listener);
  }

  async start() {
    if (this.snapshot.status !== 'READY') return;
    this.startedAt = new Date().toISOString();
    this.primeMusic(0);
    await this.beginCountdown(false);
  }

  pause(_reason: 'USER') { this.pauseInternal('USER'); }

  async resume() {
    if (this.snapshot.status !== 'PAUSED' || !this.manifest) return;
    const task = this.manifest.tasks[this.snapshot.currentTaskIndex];
    this.snapshot = { ...this.snapshot, mediaMs: task.startMs, holdProgress: 0, holdCompleted: false, currentRhythmGrade: undefined, latestGrade: undefined, latestHold: undefined };
    this.resetCurrentAttempt(task.startMs);
    this.primeMusic(task.startMs);
    await this.beginCountdown(true);
  }

  async abort() {
    this.cancelCountdown();
    this.stopPlaybackClock();
    this.stopActiveClock();
    this.media?.pause();
    this.audio?.pause();
    this.snapshot = { ...this.snapshot, status: 'ABORTED', holdProgress: 0, holdCompleted: false };
    this.publish();
    return this.createSummary('ABORTED');
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.countdownEpoch += 1;
    this.cancelCountdown();
    clearTimeout(this.lostTimer);
    this.stopPlaybackClock();
    this.stopActiveClock();
    this.media?.pause();
    this.audio?.pause();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.unsubscribeRecognition();
    this.listeners.clear();
  }

  private async beginCountdown(resuming: boolean) {
    const epoch = ++this.countdownEpoch;
    this.snapshot = { ...this.snapshot, status: 'COUNTDOWN', pauseReason: resuming ? this.snapshot.pauseReason : undefined, holdProgress: 0, holdCompleted: false, currentRhythmGrade: undefined, latestGrade: undefined, latestHold: undefined };
    this.publish();
    await new Promise<void>(resolve => {
      this.countdownResolve = resolve;
      this.countdownTimer = setTimeout(() => { this.countdownResolve = undefined; resolve(); }, 3000);
    });
    if (this.disposed || epoch !== this.countdownEpoch || !this.manifest) return;
    this.timelineAnchor = performance.now() - this.snapshot.mediaMs;
    this.activeStartedAt = performance.now();
    this.attempt = beginTaskAttempt(this.snapshot.mediaMs);
    this.lastAudioSyncMs = -Infinity;
    if (this.media?.src) {
      try { this.media.currentTime = this.snapshot.mediaMs / 1000; await this.media.play(); } catch { /* Image fallback remains active. */ }
    }
    this.startMusicAt(this.snapshot.mediaMs);
    this.snapshot = { ...this.snapshot, status: 'PLAYING', pauseReason: undefined };
    this.publish();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (timestamp: number) => {
    if (!this.manifest || this.snapshot.status !== 'PLAYING') return;
    const mediaMs = Math.min(this.manifest.durationMs, Math.max(0, timestamp - this.timelineAnchor));
    const previousIndex = this.snapshot.currentTaskIndex;
    const previousTask = this.manifest.tasks[previousIndex];
    this.accumulateCorrectHold(previousTask, Math.min(mediaMs, previousTask.endMs));

    const taskIndex = Math.min(this.manifest.tasks.length - 1, Math.floor(Math.min(mediaMs, this.manifest.durationMs - 1) / TASK_WINDOW_MS));
    if (taskIndex !== previousIndex) {
      this.finalizeTask(previousIndex);
      for (let skipped = previousIndex + 1; skipped < taskIndex; skipped += 1) {
        this.resetCurrentAttempt(this.manifest.tasks[skipped].startMs);
        this.finalizeTask(skipped);
      }
      this.resetCurrentAttempt(this.manifest.tasks[taskIndex].startMs);
      this.accumulateCorrectHold(this.manifest.tasks[taskIndex], mediaMs);
    }
    const task = this.manifest.tasks[taskIndex];
    this.snapshot = {
      ...this.snapshot,
      mediaMs,
      currentTaskIndex: taskIndex,
      currentPose: task.pose,
      nextPose: this.manifest.tasks[taskIndex + 1]?.pose,
      groupPoses: this.manifest.tasks.slice(Math.floor(taskIndex / 3) * 3, Math.floor(taskIndex / 3) * 3 + 3).map(item => item.pose),
      currentRhythmGrade: this.attempt.grade,
      holdProgress: Math.min(1, this.attempt.accumulatedMs / task.holdMs),
      holdCompleted: this.attempt.accumulatedMs >= task.holdMs,
    };
    this.syncMusic(mediaMs);
    if (timestamp - this.lastPublishedAt >= 80) {
      this.lastPublishedAt = timestamp;
      this.publish();
    }
    if (mediaMs >= this.manifest.durationMs) {
      this.finalizeTask(taskIndex);
      this.complete();
    } else this.animationFrame = requestAnimationFrame(this.tick);
  };

  private accumulateCorrectHold(task: ThemeManifest['tasks'][number], untilMs: number) {
    const correct = this.recognition.tracking === 'GOOD' && this.recognition.pose === task.pose && this.recognition.stableForMs >= POSE_DEBOUNCE_MS;
    this.attempt = advanceTaskAttempt(this.attempt, {
      mediaMs: untilMs,
      taskStartMs: task.startMs,
      targetMs: task.targetMs,
      correct,
      stableForMs: this.recognition.stableForMs,
    });
  }

  private finalizeTask(index: number) {
    if (!this.manifest) return;
    const task = this.manifest.tasks[index];
    if (!task || this.results.has(task.id)) return;
    const grade = this.attempt.grade ?? 'MISS';
    const holdCompleted = this.attempt.accumulatedMs >= task.holdMs;
    this.results.set(task.id, { grade, holdCompleted });
    const key = grade.toLowerCase() as 'perfect' | 'good' | 'miss';
    this.snapshot = {
      ...this.snapshot,
      latestGrade: { taskId: task.id, grade, nonce: ++this.nonce },
      latestHold: { taskId: task.id, completed: holdCompleted, nonce: this.nonce },
      confirmed: {
        ...this.snapshot.confirmed,
        judged: this.snapshot.confirmed.judged + 1,
        completed: this.snapshot.confirmed.completed + (holdCompleted ? 1 : 0),
        [key]: this.snapshot.confirmed[key] + 1,
      },
    };
  }

  private handleRecognition(state: RecognitionState) {
    this.recognition = state;
    this.snapshot = { ...this.snapshot, tracking: state.tracking, recognizedPose: state.pose };
    if (this.snapshot.status === 'PLAYING' && state.tracking === 'LOST') {
      if (!this.lostTimer) this.lostTimer = setTimeout(() => {
        this.lostTimer = undefined;
        if (this.recognition.tracking === 'LOST') this.pauseInternal('HAND_LOST');
      }, HAND_LOST_PAUSE_MS);
    } else if (state.tracking !== 'LOST') {
      clearTimeout(this.lostTimer);
      this.lostTimer = undefined;
      if (this.snapshot.status === 'PAUSED' && this.snapshot.pauseReason === 'HAND_LOST' && state.tracking === 'GOOD' && state.stableForMs >= HAND_RECOVERY_STABLE_MS) void this.resume();
    }
    this.publish();
  }

  private pauseInternal(reason: PauseReason) {
    if (this.snapshot.status !== 'PLAYING' && this.snapshot.status !== 'COUNTDOWN') return;
    this.countdownEpoch += 1;
    this.cancelCountdown();
    this.stopPlaybackClock();
    this.stopActiveClock();
    this.media?.pause();
    this.audio?.pause();
    this.snapshot = { ...this.snapshot, status: 'PAUSED', pauseReason: reason, holdProgress: 0, holdCompleted: false, currentRhythmGrade: undefined };
    this.resetCurrentAttempt(this.snapshot.currentTaskIndex * TASK_WINDOW_MS);
    this.publish();
  }

  private complete() {
    if (!this.manifest || this.completed) return;
    this.completed = true;
    this.stopPlaybackClock();
    this.stopActiveClock();
    this.media?.pause();
    this.audio?.pause();
    this.snapshot = { ...this.snapshot, status: 'COMPLETED', mediaMs: this.manifest.durationMs, holdProgress: 0, holdCompleted: false };
    this.publish();
    this.onComplete(this.createSummary('COMPLETED'));
  }

  private createSummary(status: 'COMPLETED' | 'ABORTED'): SessionSummary {
    if (!this.manifest) throw new Error('训练清单尚未准备好。');
    const endedAt = new Date();
    return {
      id: crypto.randomUUID(), themeId: this.manifest.id, protocolId: this.manifest.protocolId,
      manifestVersion: this.manifest.version, ruleVersion: TRAINING_RULE_VERSION, status,
      plannedTasks: this.manifest.tasks.length, completedTasks: this.snapshot.confirmed.completed,
      perfect: this.snapshot.confirmed.perfect, good: this.snapshot.confirmed.good, miss: this.snapshot.confirmed.miss,
      judgedTasks: this.snapshot.confirmed.judged, activeDurationMs: Math.min(this.manifest.durationMs, Math.round(this.activeDurationMs)),
      plannedDurationMs: this.manifest.durationMs, startedAt: this.startedAt ?? endedAt.toISOString(), endedAt: endedAt.toISOString(), syncState: 'LOCAL_ONLY',
    };
  }

  private resetCurrentAttempt(startMs: number) {
    this.attempt = beginTaskAttempt(startMs);
  }

  private stopPlaybackClock() {
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
  }

  private stopActiveClock() {
    if (this.activeStartedAt !== undefined) this.activeDurationMs += performance.now() - this.activeStartedAt;
    this.activeStartedAt = undefined;
  }

  private cancelCountdown() {
    clearTimeout(this.countdownTimer);
    this.countdownTimer = undefined;
    this.countdownResolve?.();
    this.countdownResolve = undefined;
  }

  private primeMusic(mediaMs: number) {
    if (!this.audio?.src) return;
    this.audio.currentTime = mediaMs / 1000;
    this.audio.volume = 0;
    void this.audio.play().catch(() => { /* UI reports load/playback failure without blocking training. */ });
  }

  private startMusicAt(mediaMs: number) {
    if (!this.audio?.src) return;
    this.audio.currentTime = mediaMs / 1000;
    this.audio.volume = 0.72;
    void this.audio.play().catch(() => { /* The training timeline remains authoritative. */ });
  }

  private syncMusic(mediaMs: number) {
    if (!this.audio?.src || mediaMs - this.lastAudioSyncMs < 1000) return;
    this.lastAudioSyncMs = mediaMs;
    const expectedSeconds = mediaMs / 1000;
    if (Math.abs(this.audio.currentTime - expectedSeconds) > 0.2) this.audio.currentTime = expectedSeconds;
  }

  private publish() { this.listeners.forEach(listener => listener(this.copySnapshot())); }

  private copySnapshot(): TrainingSnapshot {
    return {
      ...this.snapshot,
      confirmed: { ...this.snapshot.confirmed },
      groupPoses: this.snapshot.groupPoses ? [...this.snapshot.groupPoses] : undefined,
      latestGrade: this.snapshot.latestGrade ? { ...this.snapshot.latestGrade } : undefined,
      latestHold: this.snapshot.latestHold ? { ...this.snapshot.latestHold } : undefined,
    };
  }

  private readonly handleVisibility = () => {
    if (document.hidden && this.snapshot.status === 'PLAYING') this.pauseInternal('BACKGROUND');
  };
}
