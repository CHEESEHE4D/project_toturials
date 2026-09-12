import { useEffect, useState } from 'react';
import type { Pose } from '../contracts';
import { GESTURE_ASSETS } from '../config/assets';
import { assetUrl, poseInfo } from '../theme/themeConfig';

type TrainingPose = Exclude<Pose, 'UNKNOWN'>;

export function GestureTeachingMedia({ pose, videoUrl, disabled = false }: {
  pose: TrainingPose;
  videoUrl?: string;
  disabled?: boolean;
}) {
  const media = GESTURE_ASSETS[pose];
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setVideoFailed(false); setImageFailed(false); }, [pose, videoUrl]);
  const effectiveVideo = videoUrl ?? media.videoUrl;
  const showVideo = Boolean(!disabled && effectiveVideo && !videoFailed);
  const showImage = Boolean(!disabled && !showVideo && media.imageUrl && !imageFailed);
  return <>
    {showVideo && <video key={`${pose}-${effectiveVideo}`} src={assetUrl(effectiveVideo!)} autoPlay loop muted playsInline onError={() => setVideoFailed(true)} />}
    {showImage && <img src={assetUrl(media.imageUrl!)} alt={`${poseInfo[pose].name}教学姿势`} onError={() => setImageFailed(true)} />}
    {!showVideo && !showImage && <span className="gesture-teaching-empty" role="img" aria-label={`${poseInfo[pose].name}教学素材待接入`}>空白</span>}
  </>;
}
