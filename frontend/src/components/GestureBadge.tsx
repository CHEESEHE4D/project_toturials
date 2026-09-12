import type { Pose } from '../contracts';
import { poseInfo } from '../theme/themeConfig';
import { PoseIcon } from './PoseIcon';

type TrainingPose = Exclude<Pose, 'UNKNOWN'>;

export function GestureBadge({ pose, active = false, size = 'sequence', showLabel = true }: {
  pose: TrainingPose;
  active?: boolean;
  size?: 'sequence' | 'track' | 'preview' | 'next';
  showLabel?: boolean;
}) {
  return <span className={`gesture-badge badge-${pose.toLowerCase()} badge-${size} ${active ? 'is-active' : ''}`}>
    <span className="gesture-badge-circle"><PoseIcon pose={pose} /></span>
    {showLabel && <small>{poseInfo[pose].name}</small>}
  </span>;
}
