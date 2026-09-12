import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, History, Link2, WifiOff } from 'lucide-react';
import { Brand } from './Brand';

export function AppShell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={`app-shell ${compact ? 'is-compact' : ''}`}>
    <header className="site-header" data-exit><div className="header-inner"><Brand /><nav aria-label="主导航"><NavLink to="/history"><History size={18} /><span>我的记录</span></NavLink><NavLink to="/binding"><Link2 size={18} /><span>绑定治疗师</span></NavLink></nav></div></header>
    <main id="main-content">{children}</main>
    <footer className="site-footer" data-exit><span>每一个小动作，都值得被回应。</span><div><span>2026 复客松</span><span className="footer-dot">·</span><Link to="/therapist/login">治疗师入口 <ArrowUpRight size={13} /></Link>{import.meta.env.DEV && <Link className="design-link" to="/design">设计预览</Link>}</div></footer>
  </div>;
}
export function PageHeading({ title, eyebrow, description, back = '/' }: { title: string; eyebrow?: string; description?: string; back?: string }) {
  return <div className="page-heading" data-exit><Link to={back} className="back-link"><ArrowLeft size={18} /> 返回</Link>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 tabIndex={-1}>{title}</h1>{description && <p className="page-description">{description}</p>}</div>;
}
export function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }, [pathname]);
  return null;
}
export function OfflineNotice() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return offline ? <div className="offline-notice" role="status"><WifiOff size={16} /> 当前离线，已有记录仍保存在本机。</div> : null;
}
export function Notice({ children, retry }: { children: ReactNode; retry?: () => void }) {
  return <div className="notice" role="status"><p>{children}</p>{retry && <button className="text-button" onClick={retry}>重新尝试 <ArrowUpRight size={16} /></button>}</div>;
}
