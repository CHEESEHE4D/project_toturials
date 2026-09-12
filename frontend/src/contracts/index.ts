export type Pose = 'STRAIGHT' | 'HOOK' | 'FIST' | 'UNKNOWN';
export type TrackingQuality = 'GOOD' | 'ADJUST' | 'LOST';
export type Grade = 'PERFECT' | 'GOOD' | 'MISS';
export type PauseReason = 'HAND_LOST' | 'USER' | 'MEDIA' | 'BACKGROUND';
export type SessionStatus = 'PREPARING' | 'TUTORIAL' | 'READY' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'COMPLETED' | 'ABORTED';
export type ThemeId = 'pet' | 'garden' | 'space';
export interface TrainingSnapshot {
  status: SessionStatus;
  pauseReason?: PauseReason;
  mediaMs: number;
  currentTaskIndex: number;
  currentPose: Pose;
  nextPose?: Pose;
  groupPoses?: Array<Exclude<Pose, 'UNKNOWN'>>;
  tracking: TrackingQuality;
  recognizedPose: Pose;
  currentRhythmGrade?: Grade;
  holdCompleted: boolean;
  latestHold?: { taskId: string; completed: boolean; nonce: number };
  holdProgress: number;
  latestGrade?: { taskId: string; grade: Grade; nonce: number };
  confirmed: { completed: number; judged: number; perfect: number; good: number; miss: number };
}
export interface SessionSummary {
  id: string; themeId: string; protocolId: string; manifestVersion: string; ruleVersion: string;
  status: 'COMPLETED' | 'ABORTED'; plannedTasks: number; completedTasks: number;
  perfect: number; good: number; miss: number; judgedTasks: number;
  activeDurationMs: number; plannedDurationMs: number; startedAt: string; endedAt: string;
  syncState: 'LOCAL_ONLY' | 'PENDING' | 'SYNCED' | 'FAILED';
}
export interface ThemeManifest {
  id: string; title: string; protocolId: 'tendon-a-demo-v1'; version: string;
  bpm: 60; durationMs: 90000;
  tasks: Array<{ id: string; pose: Exclude<Pose, 'UNKNOWN'>; startMs: number; targetMs: number; endMs: number; holdMs: 2000 }>;
}
export interface SessionRepository {
  save(summary: SessionSummary): Promise<void>;
  get(id: string): Promise<SessionSummary | null>;
  list(): Promise<SessionSummary[]>;
  watch(listener: () => void): () => void;
}
export interface RecognitionState { tracking: TrackingQuality; pose: Pose; stableForMs: number }
export interface RecognitionController<Stream> {
  requestCamera(hand: 'LEFT' | 'RIGHT'): Promise<Stream>;
  subscribe(listener: (state: RecognitionState) => void): () => void;
  startTutorialPose(pose: Exclude<Pose, 'UNKNOWN'>): void;
  finishTutorialPose(): void;
  stop(): void;
}
export interface TrainingEngine<Media> {
  prepare(input: { media: Media; audio?: HTMLAudioElement; manifest: ThemeManifest }): Promise<void>;
  subscribe(listener: (snapshot: TrainingSnapshot) => void): () => void;
  start(): Promise<void>;
  pause(reason: 'USER'): void;
  resume(): Promise<void>;
  abort(): Promise<SessionSummary>;
  dispose(): void;
}
export interface BindingService {
  previewInvite(code: string): Promise<{ token: string; therapistName: string }>;
  confirmBinding(input: { token: string; displayName: string; consentVersion: string }): Promise<void>;
  getBinding(): Promise<{ therapistName: string; boundAt: string } | null>;
  unbind(): Promise<void>;
}
export interface PatientListItem { id: string; displayName: string; checkedInToday: boolean; lastTrainedAt: string | null }
export interface SyncService {
  enqueue(sessionId: string): Promise<void>;
  retryPending(): Promise<void>;
  subscribe(listener: (sessionId: string, state: SessionSummary['syncState']) => void): () => void;
}
export interface TherapistService {
  login(email: string, password: string): Promise<void>;
  listPatients(): Promise<PatientListItem[]>;
  listSessions(userId: string): Promise<SessionSummary[]>;
  logout(): Promise<void>;
}
