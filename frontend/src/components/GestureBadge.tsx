import type { Pose } from '../contracts';
import { poseInfo } from '../theme/themeConfig';
import { GESTURE_ICON_URLS } from '../config/gestureIcons';

type TrainingPose = Exclude<Pose, 'UNKNOWN'>;

export function GestureBadge({ pose, active = false, size = 'sequence', showLabel = true }: {
  pose: TrainingPose;
  active?: boolean;
  size?: 'sequence' | 'track' | 'preview' | 'next';
  showLabel?: boolean;
}) {
  return <span className={`gesture-badge badge-${pose.toLowerCase()} badge-${size} ${active ? 'is-active' : ''}`}>
    <span className="gesture-badge-circle"><img src={GESTURE_ICON_URLS[pose]} alt="" aria-hidden="true" /></span>
    {showLabel && <small>{poseInfo[pose].name}</small>}
  </span>;
}
