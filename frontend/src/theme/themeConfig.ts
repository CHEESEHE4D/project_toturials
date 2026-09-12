import type { CSSProperties } from 'react';
import type { ThemeId } from '../contracts';
import { getThemeAssets } from '../config/assets';

export const themes = [
  { id: 'pet', name: '萌宠互动', english: 'A LITTLE COMPANION', description: '和毛茸茸的朋友，分享一点快乐。', mood: '温暖陪伴', accent: '#D9976C', soft: '#F2D7C4', highlight: '#FFF1E4', icon: 'paw' },
  { id: 'garden', name: '花园养成', english: 'LET IT GROW', description: '随每一次舒展，迎接悄悄绽放。', mood: '自然呼吸', accent: '#8FA681', soft: '#DEE8D8', highlight: '#F1F6EC', icon: 'leaf' },
  { id: 'space', name: '星空旅行', english: 'A MOMENT IN SPACE', description: '循着轻柔的节拍，去看远方的星。', mood: '安静漫游', accent: '#8793AE', soft: '#DFE3ED', highlight: '#F1F3FA', icon: 'orbit' },
] as const;
export type VisualTheme = typeof themes[number];
export function getTheme(id: string | undefined): VisualTheme | undefined { return themes.find(theme => theme.id === id); }
export function themeStyle(theme: VisualTheme): CSSProperties {
  return { '--theme-accent': theme.accent, '--theme-accent-soft': theme.soft, '--theme-highlight': theme.highlight } as CSSProperties;
}
export function assetUrl(path: string) {
  if (/^(?:https?:|data:|blob:)/.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
export function posterUrl(id: ThemeId | string) { return assetUrl(getThemeAssets(id as ThemeId)?.posterImage ?? THEME_FALLBACK_POSTER); }
const THEME_FALLBACK_POSTER = 'themes/pet/poster.jpg';
export const poseInfo = {
  STRAIGHT: { name: '伸指', hint: '五指自然伸直，手腕保持平稳。', short: '五指伸直' },
  HOOK: { name: '钩拳', hint: '弯曲手指中间和末端，指根保持伸直。', short: '慢慢弯曲' },
  FIST: { name: '握拳', hint: '慢慢收拢手指，轻轻握住。', short: '轻轻收拢' },
  UNKNOWN: { name: '把手放回画面', hint: '把一只手完整放进画面。', short: '准备好了吗' },
};
