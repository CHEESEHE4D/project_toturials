import type { BindingService, RecognitionController, SessionRepository, SessionSummary, SyncService, TherapistService, TrainingEngine } from '../contracts';
import { sessionRepository } from './sessionRepository';

// Integration seam for teammate B. The view layer never classifies landmarks or calculates grades.
export interface AppRuntime {
  recognition?: RecognitionController<MediaStream>;
  createEngine?: (onComplete: (summary: SessionSummary) => void) => TrainingEngine<HTMLVideoElement>;
  repository: SessionRepository;
  binding?: BindingService;
  sync?: SyncService;
  therapist?: TherapistService;
  tutorialVideos?: Partial<Record<'STRAIGHT' | 'HOOK' | 'FIST', string>>;
  preparationPolicy?: { calibrationStableMs: number; poseStableMs: number };
  subscribeAura?: (listener: (aura: { x: number; y: number; scale: number; rotation: number; tracking: 'GOOD' | 'ADJUST' | 'LOST' }) => void) => () => void;
}
let runtime: AppRuntime = { repository: sessionRepository };
export const getRuntime = () => runtime;
export function installRuntime(adapters: Partial<AppRuntime>) { runtime = { ...runtime, ...adapters }; }
export const preparationSession: { themeId?: string; hand?: 'LEFT' | 'RIGHT'; ready: boolean; stream?: MediaStream } = { ready: false };
export function endCameraSession() {
  preparationSession.stream?.getTracks().forEach(track => track.stop());
  getRuntime().recognition?.stop();
  preparationSession.stream = undefined;
  preparationSession.ready = false;
}
