import { Component, lazy, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { LaunchProvider, RippleLoading } from '../components/RippleLoading';
import { AppShell, OfflineNotice, RouteEffects } from '../components/Layout';
import HomePage from '../pages/HomePage';

const PreparePage = lazy(() => import('../pages/PreparePage'));
const TrainingPage = lazy(() => import('../pages/TrainingPage'));
const ResultPage = lazy(() => import('../pages/ResultPage'));
const HistoryPage = lazy(() => import('../pages/HistoryPage'));
const BindingPage = lazy(() => import('../pages/BindingPage'));
const TherapistPage = lazy(() => import('../pages/TherapistPage'));
const DesignPage = import.meta.env.DEV ? lazy(() => import('../dev/DesignPage')) : null;

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page render failed', error, info.componentStack); }
  render() { return this.state.failed ? <div className="narrow-page"><h1>这一拍，稍微等一下</h1><p>页面没有加载完整，你的本机记录不会因此被删除。</p><button className="primary-button" onClick={() => location.reload()}>重新打开页面</button><a className="text-button" href={import.meta.env.BASE_URL}>返回首页</a></div> : this.props.children; }
}
export default function App() {
  return <ErrorBoundary><HashRouter><a className="skip-link" href="#main-content">跳到主要内容</a><LaunchProvider><RouteEffects /><OfflineNotice /><Suspense fallback={<div className="route-loading"><RippleLoading /></div>}><Routes>
    <Route path="/" element={<HomePage />} /><Route path="/prepare/:themeId" element={<PreparePage />} /><Route path="/train/:themeId" element={<TrainingPage />} /><Route path="/result/:sessionId" element={<ResultPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/binding" element={<BindingPage />} />
    <Route path="/therapist" element={<Navigate to="/therapist/login" replace />} /><Route path="/therapist/login" element={<TherapistPage />} /><Route path="/therapist/patients" element={<TherapistPage />} /><Route path="/therapist/patients/:id" element={<TherapistPage />} />
    {DesignPage && <Route path="/design" element={<DesignPage />} />}<Route path="*" element={<AppShell><div className="narrow-page"><h1>走远了一点，回来吧</h1><p>这里还没有内容，回到首页选一个喜欢的世界。</p><Link to="/" className="primary-button">返回首页</Link></div></AppShell>} />
  </Routes></Suspense></LaunchProvider></HashRouter></ErrorBoundary>;
}
