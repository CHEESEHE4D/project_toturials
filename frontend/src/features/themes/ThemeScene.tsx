import { useState } from 'react';
import { posterUrl, type VisualTheme } from '../../theme/themeConfig';

export function ThemeScene({ theme }: { theme: VisualTheme }) {
  const [failed, setFailed] = useState(false);
  return <article className={`theme-scene${failed ? ' scene-unavailable' : ''}`}>
    {!failed && <img src={posterUrl(theme.id)} alt={`${theme.name}主题场景`}
      draggable={false} onError={() => setFailed(true)} />}
    <div className="theme-scene-copy">
      <h2>{theme.name}</h2><p>{theme.description}</p>
      {failed && <p className="scene-error">主题画面暂时不可用</p>}
    </div>
  </article>;
}
