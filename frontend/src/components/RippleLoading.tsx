import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { ThemeId } from '../contracts';
import { posterUrl } from '../theme/themeConfig';

gsap.registerPlugin(useGSAP);

// Independent periods, phases, diameters and opacity peaks: no regular spinner rhythm.
export const rippleSeeds = [
  { x: 22, y: 28, size: 91, duration: 2.7, delay: 0.02, rest: 1.2, peak: .26 },
  { x: 69, y: 23, size: 136, duration: 3.6, delay: 0.78, rest: .6, peak: .19 },
  { x: 47, y: 47, size: 66, duration: 2.3, delay: .34, rest: 1.5, peak: .32 },
  { x: 77, y: 63, size: 110, duration: 3.2, delay: 1.41, rest: 1.1, peak: .23 },
  { x: 28, y: 75, size: 153, duration: 4.1, delay: .97, rest: .9, peak: .17 },
  { x: 55, y: 83, size: 53, duration: 2.5, delay: 2.03, rest: 1.8, peak: .30 },
  { x: 86, y: 39, size: 48, duration: 2.1, delay: 1.78, rest: 2.3, peak: .25 },
];

export function RippleLoading({ className = '', startDelay = 0 }: { className?: string; startDelay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ reduce: '(prefers-reduced-motion: reduce)', normal: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
      const reduce = conditions?.reduce;
      const nodes = ref.current?.querySelectorAll('.rain-ripple') ?? [];
      nodes.forEach((node, i) => {
        const seed = rippleSeeds[i];
        const tl = gsap.timeline({ repeat: -1, repeatDelay: seed.rest, delay: seed.delay + startDelay, defaults: { ease: 'sine.inOut' } });
        tl.fromTo(node, { scale: reduce ? .8 : .09, opacity: 0 }, { scale: reduce ? .8 : 1, duration: seed.duration, ease: 'power1.out' }, 0)
          .to(node, { opacity: seed.peak, duration: seed.duration * .35 }, 0)
          .to(node, { opacity: 0, duration: seed.duration * .65 }, seed.duration * .35);
      });
    }, ref);
    return () => mm.revert();
  }, { scope: ref, dependencies: [startDelay], revertOnUpdate: true });
  return <div ref={ref} className={`ripple-loading ${className}`} role="status" aria-live="polite" aria-label="正在准备下一段节奏时光" aria-busy="true"><span className="sr-only">正在加载，请稍候</span><div className="ripple-field" aria-hidden="true">{rippleSeeds.map((s, i) => <span key={i} className="rain-ripple" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size } as CSSProperties} />)}</div></div>;
}

const LaunchContext = createContext<(theme: ThemeId) => void>(() => {});
export function useLaunchTheme() { return useContext(LaunchContext); }

export function LaunchProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const launch = useCallback((id: ThemeId) => { if (busy.current) return; busy.current = true; setError(''); setTheme(id); }, []);
  useGSAP(() => {
    if (!theme) return;
    let cancelled = false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = container.current!;
    const targets = root.querySelectorAll('[data-exit]');
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: .56 } });
    tl.to(targets, { opacity: 0, x: (_, node) => reduce ? 0 : (node.getBoundingClientRect().left + node.getBoundingClientRect().width / 2 - innerWidth / 2) * .10, y: (_, node) => reduce ? 0 : (node.getBoundingClientRect().top + node.getBoundingClientRect().height / 2 - innerHeight / 2) * .09, stagger: .035 }, 0)
      .fromTo('.launch-overlay', { opacity: 0 }, { opacity: 1, duration: .36 }, .34);
    const image = new Image();
    let timeout: ReturnType<typeof setTimeout>;
    const ready = new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('主题画面还没有加载好，请再试一次。')), 10000);
      image.onload = () => { clearTimeout(timeout); resolve(); };
      image.onerror = () => { clearTimeout(timeout); reject(new Error('主题画面还没有加载好，请再试一次。')); };
      image.src = posterUrl(theme);
    });
    let dwell: ReturnType<typeof setTimeout>;
    Promise.all([ready, import('../pages/PreparePage'), new Promise(resolve => { dwell = setTimeout(resolve, reduce ? 1100 : 2900); })])
      .then(() => { if (!cancelled) { navigate(`/prepare/${theme}`); setTheme(null); busy.current = false; } })
      .catch((err: Error) => { if (!cancelled) { setTheme(null); setError(err.message); busy.current = false; } });
    return () => { cancelled = true; clearTimeout(timeout); clearTimeout(dwell); image.onload = null; image.onerror = null; };
  }, { scope: container, dependencies: [theme], revertOnUpdate: true });
  return <LaunchContext.Provider value={launch}><div ref={container}><div inert={theme ? true : undefined} aria-hidden={theme ? true : undefined}>{children}</div>{theme && <div className="launch-overlay"><RippleLoading startDelay={.55} /></div>}{error && <div role="alert" className="toast">{error}<button aria-label="关闭提示" onClick={() => setError('')}>×</button></div>}</div></LaunchContext.Provider>;
}
