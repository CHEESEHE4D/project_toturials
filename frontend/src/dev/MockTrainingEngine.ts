import type { Grade, PauseReason, Pose, TrainingEngine, TrainingSnapshot } from '../contracts';

// DEV ONLY. Synthetic visual events, explicitly opt-in. Never persisted or used for real training.
export class MockTrainingEngine implements TrainingEngine<HTMLVideoElement> {
  private listeners = new Set<(snapshot: TrainingSnapshot) => void>();
  private timer?: ReturnType<typeof setInterval>;
  private countdownTimer?: ReturnType<typeof setTimeout>;
  private nonce = 0;
  private snapshot: TrainingSnapshot = { status: 'READY', mediaMs: 0, currentTaskIndex: 0, currentPose: 'STRAIGHT', nextPose: 'HOOK', holdProgress: 0, confirmed: { completed: 0, perfect: 0, good: 0, miss: 0 } };
  private poses: Pose[] = ['STRAIGHT', 'HOOK', 'FIST'];
  async prepare() {}
  subscribe(listener: (s: TrainingSnapshot) => void) { this.listeners.add(listener); listener({ ...this.snapshot }); return () => { this.listeners.delete(listener); }; }
  private publish() { this.listeners.forEach(listener => listener({ ...this.snapshot })); }
  async start() {
    clearTimeout(this.countdownTimer); clearInterval(this.timer);
    this.snapshot = { ...this.snapshot, status: 'COUNTDOWN', holdProgress: 0, latestGrade: undefined };
    this.publish();
    this.countdownTimer = setTimeout(() => { this.snapshot.status = 'PLAYING'; this.publish(); this.timer = setInterval(() => this.tick(), 100); }, 3000);
  }
  private tick() {
    if (this.snapshot.status !== 'PLAYING') return;
    const time = Math.min(90000, this.snapshot.mediaMs + 100);
    const task = Math.min(14, Math.floor(time / 6000));
    const phase = time % 6000;
    const grade: Grade = ['PERFECT', 'GOOD', 'PERFECT', 'MISS', 'PERFECT'][task % 5] as Grade;
    this.snapshot = { ...this.snapshot, mediaMs: time, currentTaskIndex: task, currentPose: this.poses[task % 3], nextPose: this.poses[(task + 1) % 3], holdProgress: phase < 2000 ? 0 : Math.min(1, (phase - 2000) / 3000) };
    if (phase === 2100) this.snapshot.latestGrade = { taskId: `design-task-${task}`, grade, nonce: ++this.nonce };
    if (time >= 90000) { this.snapshot.status = 'COMPLETED'; clearInterval(this.timer); }
    this.publish();
  }
  pause(reason: PauseReason = 'USER') { if (this.snapshot.status === 'COMPLETED') return; clearTimeout(this.countdownTimer); this.snapshot = { ...this.snapshot, status: 'PAUSED', pauseReason: reason }; this.publish(); }
  async resume() { this.snapshot.mediaMs = this.snapshot.currentTaskIndex * 6000; await this.start(); }
  async abort(): Promise<never> { throw new Error('设计预览不会创建训练记录'); }
  feedback(grade: Grade) { this.snapshot = { ...this.snapshot, status: 'PLAYING', latestGrade: { taskId: 'design-manual', grade, nonce: ++this.nonce }, holdProgress: .7 }; this.publish(); }
  reset() { this.dispose(); this.snapshot = { ...this.snapshot, status: 'READY', mediaMs: 0, holdProgress: 0, currentTaskIndex: 0, currentPose: 'STRAIGHT', latestGrade: undefined, pauseReason: undefined }; this.publish(); }
  dispose() { clearInterval(this.timer); clearTimeout(this.countdownTimer); }
}
