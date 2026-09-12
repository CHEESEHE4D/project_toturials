import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { ThemeManifest, TrainingEngine, TrainingSnapshot, SessionSummary } from '../contracts';
import { assetUrl, getTheme } from '../theme/themeConfig';
import { getThemeAssets } from '../config/assets';
import { endCameraSession, getRuntime, preparationSession } from '../services/runtime';
import { loadManifest } from '../services/manifest';
import { TrainingStage } from '../features/training/TrainingStage';
import { AppShell, Notice } from '../components/Layout';

const initial: TrainingSnapshot = { status: 'PREPARING', mediaMs: 0, currentTaskIndex: 0, currentPose: 'STRAIGHT', tracking: 'LOST', recognizedPose: 'UNKNOWN', holdCompleted: false, holdProgress: 0, confirmed: { completed: 0, judged: 0, perfect: 0, good: 0, miss: 0 } };
export default function TrainingPage() {
  const { themeId } = useParams();
  const theme = getTheme(themeId);
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<TrainingEngine<HTMLVideoElement> | null>(null);
  const [snapshot, setSnapshot] = useState(initial);
  const [manifest, setManifest] = useState<ThemeManifest>();
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [pendingSummary, setPendingSummary] = useState<SessionSummary>();
  const [busy, setBusy] = useState(false);
  const runtime = getRuntime();
  const assets = theme ? getThemeAssets(theme.id) : undefined;
  const allowed = theme && preparationSession.ready && preparationSession.themeId === theme.id && runtime.createEngine;
  async function saveResult(summary: SessionSummary) {
    setPendingSummary(summary);
    try { await runtime.repository.save(summary); navigate(`/result/${summary.id}`, { replace: true }); }
    catch { setError('本机记录尚未保存，请重试保存。'); }
  }
  useEffect(() => {
    if (!allowed || !theme) return;
    const controller = new AbortController();
    loadManifest(theme.id, controller.signal).then(sessionManifest => {
      if (controller.signal.aborted) return;
      setManifest(sessionManifest);
    }).catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [allowed, theme]);
  useEffect(() => {
    if (!manifest || !video.current || !audio.current || !runtime.createEngine || !theme) return;
    let active = true;
    const current = runtime.createEngine(summary => { if (active) void saveResult(summary); });
    engine.current = current;
    const unsubscribe = current.subscribe(s => { if (active) setSnapshot(s); });
    current.prepare({ media: video.current, audio: audio.current, manifest }).catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; unsubscribe(); current.dispose(); endCameraSession(); };
  }, [manifest, theme]);
  useEffect(() => {
    if (snapshot.status !== 'COUNTDOWN') return;
    setCountdown(3);
    const timer = setInterval(() => setCountdown(n => Math.max(1, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [snapshot.status]);
  async function command(action: 'start' | 'resume' | 'abort') {
    if (busy || !engine.current) return;
    setBusy(true); setError('');
    try { if (action === 'abort') await saveResult(await engine.current.abort()); else await engine.current[action](); }
    catch { setError('训练暂时无法继续，请返回准备页面重试。'); }
    finally { setBusy(false); }
  }
  if (!allowed) return <AppShell><div className="narrow-page"><h1>先做一点小准备</h1><p>完成摄像头校准和三个动作确认后，就可以开始训练。</p><Link to={theme ? `/prepare/${theme.id}` : '/'} className="primary-button">{theme ? '进入准备' : '选择主题'}</Link></div></AppShell>;
  if (!assets) return null;
  return <div className="training-page" style={{ background: assets.surroundColor } as CSSProperties}><TrainingStage theme={theme} assets={assets} snapshot={snapshot} videoRef={video} videoUrl={assets.backgroundVideo ? assetUrl(assets.backgroundVideo) : undefined} audioRef={audio} musicUrl={assetUrl(assets.musicUrl)} backgroundImageUrl={assetUrl(assets.backgroundImage)} cameraStream={preparationSession.stream} hand={preparationSession.hand} countdown={countdown} onPause={() => engine.current?.pause('USER')} onResume={() => void command('resume')} onAbort={() => void command('abort')} onStart={() => void command('start')} onBack={() => navigate(`/prepare/${theme.id}`)} message={error} />{pendingSummary && error && <div className="save-retry"><Notice retry={() => void saveResult(pendingSummary)}>{error}</Notice></div>}{snapshot.status === 'PREPARING' && <div className="training-preparing"><p>{error || '正在准备训练内容…'}</p><Link to={`/prepare/${theme.id}`} className="text-button">返回准备</Link></div>}</div>;
}
