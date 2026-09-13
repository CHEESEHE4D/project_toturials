import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { ThemeId } from '../../contracts';
import { themes, themeStyle } from '../../theme/themeConfig';
import { ThemeScene } from './ThemeScene';
import { createSelectionGate, nextIndex, swipeDirection } from './selection';

gsap.registerPlugin(useGSAP);

export function ThemeSelector({ onLaunch }: { onLaunch: (id: ThemeId) => void }) {
  const gate = useRef(createSelectionGate()).current;
  const [state, setState] = useState(gate.get);
  const [reduce, setReduce] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const { pending, index } = state;
  const theme = themes[index];

  useLayoutEffect(() => {
    const stage = viewport.current!;
    const copies = [...stage.querySelectorAll<HTMLElement>('.theme-scene-copy')];
    function fitText() {
      const height = Math.max(...copies.map(copy => {
        const style = getComputedStyle(copy);
        return parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
          [...copy.children].reduce((total, child) => {
            const node = child as HTMLElement;
            const css = getComputedStyle(node);
            return total + node.offsetHeight + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
          }, 0);
      }));
      stage.style.minHeight = `${Math.ceil(height) + 24}px`;
    }
    fitText();
    const observer = new ResizeObserver(fitText);
    copies.forEach(copy => {
      observer.observe(copy);
      [...copy.children].forEach(child => observer.observe(child));
    });
    return () => observer.disconnect();
  }, [index, pending]);

  useEffect(() => {
    function cancel() {
      timeline.current?.kill();
      gate.cancel();
      pointer.current = null;
      setState(gate.get());
    }
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const changeMotion = () => { cancel(); setReduce(media.matches); };
    media.addEventListener('change', changeMotion);
    let width = viewport.current!.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (Math.abs(next - width) > 1) { width = next; cancel(); }
    });
    observer.observe(viewport.current!);
    return () => {
      media.removeEventListener('change', changeMotion);
      observer.disconnect();
      timeline.current?.kill();
      gate.cancel();
      pointer.current = null;
    };
  }, [gate]);

  useGSAP(() => {
    if (!pending) return;
    const stage = viewport.current!;
    const body = cube.current!;
    const current = body.querySelector<HTMLElement>('.theme-face-current')!;
    const incoming = body.querySelector<HTMLElement>('.theme-face-incoming')!;
    const width = stage.getBoundingClientRect().width;
    if (!width) { gate.cancel(); setState(gate.get()); return; }
    const tl = gsap.timeline({
      defaults: { duration: reduce ? .12 : .56, ease: 'power2.inOut' },
      onComplete: () => { if (gate.finish(pending.token)) setState(gate.get()); },
    });
    timeline.current = tl;
    if (reduce) {
      gsap.set([current, incoming], { transform: 'none' });
      tl.fromTo(incoming, { opacity: 0 }, { opacity: 1 }, 0).to(current, { opacity: 0 }, 0);
    } else {
      gsap.set(current, { transform: `translateZ(${width / 2}px)` });
      gsap.set(incoming, { transform: `rotateY(${pending.direction * 90}deg) translateZ(${width / 2}px)` });
      gsap.set(body, { z: -width / 2, rotationY: 0 });
      tl.to(body, { rotationY: -pending.direction * 90 }, 0)
        .fromTo(current.querySelector('.theme-face-shade'), { opacity: 0 }, { opacity: .18 }, 0)
        .fromTo(incoming.querySelector('.theme-face-shade'), { opacity: .18 }, { opacity: 0 }, 0);
    }
    return () => { tl.kill(); timeline.current = null; };
  }, { scope: root, dependencies: [pending, reduce], revertOnUpdate: true });

  function select(to: number) { if (gate.begin(to)) setState(gate.get()); }
  function enter() {
    const current = gate.get();
    if (!current.pending) onLaunch(themes[current.index].id);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || gate.get().pending) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== event.pointerId) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (direction) select(nextIndex(gate.get().index, direction));
  }

  return <div ref={root} className="theme-selector" data-exit data-busy={Boolean(pending)}
    onKeyDown={event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      if (!event.repeat) select(nextIndex(gate.get().index, event.key === 'ArrowRight' ? 1 : -1));
    }}>
    <div className="theme-stage-row">
      <button className="theme-arrow" aria-label="上一个主题" aria-disabled={Boolean(pending)}
        onClick={() => select(nextIndex(gate.get().index, -1))}><ChevronLeft /></button>
      <div className="theme-clip">
        <div ref={viewport} className="theme-viewport" onPointerDown={pointerDown} onPointerUp={pointerUp}
          onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }}>
          <div ref={cube} className="theme-cube">
            <div className="theme-face theme-face-current" style={themeStyle(theme)}>
              <ThemeScene key={theme.id} theme={theme} /><span className="theme-face-shade" aria-hidden="true" />
            </div>
            {pending && <div className="theme-face theme-face-incoming" inert aria-hidden="true" style={themeStyle(themes[pending.to])}>
              <ThemeScene key={themes[pending.to].id} theme={themes[pending.to]} /><span className="theme-face-shade" />
            </div>}
          </div>
        </div>
      </div>
      <button className="theme-arrow" aria-label="下一个主题" aria-disabled={Boolean(pending)}
        onClick={() => select(nextIndex(gate.get().index, 1))}><ChevronRight /></button>
    </div>
    <div className="theme-controls" role="group" aria-label="选择主题">
      {themes.map((item, i) => <button key={item.id} className="theme-dot" aria-label={`选择${item.name}`}
        aria-pressed={index === i} aria-disabled={Boolean(pending)} onClick={() => select(i)}><span /></button>)}
    </div>
    <button className="primary-button theme-enter" aria-label={`进入这个世界：${theme.name}`}
      aria-disabled={Boolean(pending)} onClick={enter}>进入这个世界<ArrowRight size={18} /></button>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{theme.name}，{index + 1} / 3</p>
  </div>;
}
