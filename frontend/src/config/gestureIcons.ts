import type { Pose } from '../contracts';
import straightUrl from '../assets/gestures/straight.png';
import hookUrl from '../assets/gestures/hook.png';
import fistUrl from '../assets/gestures/fist.png';

type TrainingPose = Exclude<Pose, 'UNKNOWN'>;

// Single source of truth shared by the rhythm track and bottom sequence.
export const GESTURE_ICON_URLS: Record<TrainingPose, string> = {
  STRAIGHT: straightUrl,
  HOOK: hookUrl,
  FIST: fistUrl,
};
