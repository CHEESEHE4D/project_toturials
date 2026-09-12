import type { Pose, ThemeId } from '../contracts';

type TrainingPose = Exclude<Pose, 'UNKNOWN'>;

export interface ThemeAssets {
  posterImage: string;
  backgroundImage: string;
  backgroundVideo?: string;
  musicUrl: string;
  surroundColor: string;
  decoration: 'none' | 'petals' | 'stars';
}

// Paths in this file are the single source of truth for training media.
// Optional paths are omitted until a real file exists, preventing false 404s.
export const THEME_ASSETS: Record<ThemeId, ThemeAssets> = {
  pet: { posterImage: 'themes/pet/poster.jpg', backgroundImage: 'themes/pet/background.jpg', musicUrl: 'audio/pet.mp3', surroundColor: '#d9c5ae', decoration: 'none' },
  garden: { posterImage: 'themes/garden/poster.jpg', backgroundImage: 'themes/garden/background.jpg', musicUrl: 'audio/garden.mp3', surroundColor: '#cbd7bd', decoration: 'petals' },
  space: { posterImage: 'themes/space/poster.jpg', backgroundImage: 'themes/space/background.jpg', musicUrl: 'audio/space.mp3', surroundColor: '#303b68', decoration: 'stars' },
};

export const GESTURE_ASSETS: Record<TrainingPose, {
  imageUrl?: string;
  videoUrl?: string;
  fallback: 'BLANK';
  reviewState: 'MISSING_REVIEWED_MEDIA' | 'PENDING_REVIEW' | 'APPROVED';
}> = {
  STRAIGHT: { fallback: 'BLANK', reviewState: 'MISSING_REVIEWED_MEDIA' },
  HOOK: { fallback: 'BLANK', reviewState: 'MISSING_REVIEWED_MEDIA' },
  FIST: { fallback: 'BLANK', reviewState: 'MISSING_REVIEWED_MEDIA' },
};

export const AUDIO_ASSETS = {
  feedback: {
    perfectUrl: undefined as string | undefined,
    goodUrl: undefined as string | undefined,
    holdCompleteUrl: undefined as string | undefined,
  },
};

export function getThemeAssets(id: ThemeId): ThemeAssets { return THEME_ASSETS[id]; }
