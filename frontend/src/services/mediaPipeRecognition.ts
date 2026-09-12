import type { Pose, RecognitionController, RecognitionState, TrackingQuality } from '../contracts';
import { assetUrl } from '../theme/themeConfig';
import { classifyHandPose, mapHandToAura, trackingQuality, type HandAuraSample, type HandPoint } from './handGeometry';

type HandResult = { landmarks: HandPoint[][] };
type HandLandmarkerInstance = {
  detectForVideo(video: HTMLVideoElement, timestamp: number): HandResult;
  close(): void;
};

const LOST_STATE: RecognitionState = { tracking: 'LOST', pose: 'UNKNOWN', stableForMs: 0 };
// Main-thread fallback from the implementation guide: keep synchronous inference at 10 Hz.
const FRAME_INTERVAL_MS = 100;
const MAX_CONTIGUOUS_SAMPLE_GAP_MS = 150;

class MediaPipeRecognition implements RecognitionController<MediaStream> {
  private readonly listeners = new Set<(state: RecognitionState) => void>();
  private readonly auraListeners = new Set<(aura: HandAuraSample) => void>();
  private stream?: MediaStream;
  private video?: HTMLVideoElement;
  private landmarker?: HandLandmarkerInstance;
  private animationFrame?: number;
  private runId = 0;
  private lastVideoTime = -1;
  private lastInferenceAt = -Infinity;
  private stableKey = '';
  private stableSince = 0;
  private lastSampleAt = 0;
  private tutorialPose?: Exclude<Pose, 'UNKNOWN'>;

  async requestCamera(_hand: 'LEFT' | 'RIGHT') {
    this.stop();
    const runId = this.runId;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.srcObject = stream;
      await video.play();

      const landmarker = await this.createLandmarker();
      if (runId !== this.runId) {
        landmarker.close();
        stream.getTracks().forEach(track => track.stop());
        throw new DOMException('Camera request superseded.', 'AbortError');
      }

      this.stream = stream;
      this.video = video;
      this.landmarker = landmarker;
      this.animationFrame = requestAnimationFrame(this.processFrame);
      return stream;
    } catch (error) {
      stream.getTracks().forEach(track => track.stop());
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error('手部识别模型加载失败，请检查网络后刷新页面重试。', { cause: error });
    }
  }

  subscribe(listener: (state: RecognitionState) => void) {
    this.listeners.add(listener);
    listener(LOST_STATE);
    return () => this.listeners.delete(listener);
  }

  subscribeAura(listener: (aura: HandAuraSample) => void) {
    this.auraListeners.add(listener);
    listener({ x: 0.5, y: 0.5, scale: 0.8, rotation: 0, tracking: 'LOST' });
    return () => this.auraListeners.delete(listener);
  }

  startTutorialPose(pose: Exclude<Pose, 'UNKNOWN'>) {
    this.tutorialPose = pose;
    this.resetStability();
  }

  finishTutorialPose() {
    this.tutorialPose = undefined;
    this.resetStability();
  }

  stop() {
    this.runId += 1;
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    this.landmarker?.close();
    this.landmarker = undefined;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    this.video = undefined;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.lastVideoTime = -1;
    this.lastInferenceAt = -Infinity;
    this.lastSampleAt = 0;
    this.tutorialPose = undefined;
    this.resetStability();
    this.emitState(LOST_STATE);
    this.emitAura({ x: 0.5, y: 0.5, scale: 0.8, rotation: 0, tracking: 'LOST' });
  }

  private readonly processFrame = (timestamp: number) => {
    const video = this.video;
    const landmarker = this.landmarker;
    if (!video || !landmarker) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.currentTime !== this.lastVideoTime &&
        timestamp - this.lastInferenceAt >= FRAME_INTERVAL_MS) {
      this.lastVideoTime = video.currentTime;
      this.lastInferenceAt = timestamp;
      try {
        const landmarks = landmarker.detectForVideo(video, timestamp).landmarks[0] ?? [];
        this.consumeLandmarks(landmarks, timestamp);
      } catch {
        this.consumeLandmarks([], timestamp);
      }
    }
    this.animationFrame = requestAnimationFrame(this.processFrame);
  };

  private consumeLandmarks(landmarks: readonly HandPoint[], timestamp: number) {
    const tracking = trackingQuality(landmarks);
    const pose = tracking === 'LOST' ? 'UNKNOWN' : classifyHandPose(landmarks);
    const stabilityPose = this.tutorialPose ? pose : 'CALIBRATION';
    const stableKey = tracking === 'GOOD' ? `${tracking}:${stabilityPose}` : tracking;
    const sampleGap = this.lastSampleAt === 0 ? 0 : timestamp - this.lastSampleAt;
    this.lastSampleAt = timestamp;
    if (stableKey !== this.stableKey || sampleGap > MAX_CONTIGUOUS_SAMPLE_GAP_MS) {
      this.stableKey = stableKey;
      this.stableSince = timestamp;
    }
    const stableForMs = tracking === 'LOST' ? 0 : Math.max(0, timestamp - this.stableSince);
    this.emitState({ tracking, pose, stableForMs });
    this.emitAura(mapHandToAura(landmarks, tracking));
  }

  private resetStability() {
    this.stableKey = '';
    this.stableSince = performance.now();
    this.lastSampleAt = 0;
  }

  private emitState(state: RecognitionState) {
    this.listeners.forEach(listener => listener(state));
  }

  private emitAura(aura: HandAuraSample & { tracking: TrackingQuality }) {
    this.auraListeners.forEach(listener => listener(aura));
  }

  private async createLandmarker(): Promise<HandLandmarkerInstance> {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(assetUrl('mediapipe'));
    const options = {
      baseOptions: { modelAssetPath: assetUrl('models/hand_landmarker.task'), delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    };
    try {
      return await HandLandmarker.createFromOptions(vision, options);
    } catch {
      return HandLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: 'CPU' as const },
      });
    }
  }
}

export function createMediaPipeRecognition() {
  const controller = new MediaPipeRecognition();
  return {
    recognition: controller as RecognitionController<MediaStream>,
    subscribeAura: controller.subscribeAura.bind(controller),
  };
}
