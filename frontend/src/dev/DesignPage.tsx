import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Hand, Play, RotateCcw } from 'lucide-react';
import type { Grade, Pose, SessionSummary, ThemeId, TrainingSnapshot } from '../contracts';
import { Brand } from '../components/Brand';
import { RippleLoading } from '../components/RippleLoading';
import { PoseIcon } from '../components/PoseIcon';
import { GestureBadge } from '../components/GestureBadge';
import { GestureTeachingMedia } from '../components/GestureTeachingMedia';
import { ResultSummary } from '../features/history/ResultSummary';
import { HistoryContent } from '../features/history/HistoryContent';
import { TrainingStage } from '../features/training/TrainingStage';
import { themes, getTheme, poseInfo, themeStyle } from '../theme/themeConfig';
import { MockTrainingEngine } from './MockTrainingEngine';
import { assetUrl } from '../theme/themeConfig';
import { getThemeAssets } from '../config/assets';

const screens = ['训练', '图标', '加载', '校准', '教学', '结果', '历史'] as const;
type Screen = typeof screens[number];
const initial: TrainingSnapshot = { status: 'READY', mediaMs: 0, currentTaskIndex: 0, currentPose: 'STRAIGHT', tracking: 'GOOD', recognizedPose: 'STRAIGHT', holdCompleted: false, holdProgress: 0, confirmed: { completed: 0, judged: 0, perfect: 0, good: 0, miss: 0 } };
export default function DesignPage() {
  const [searchParams] = useSearchParams();
  const stageOnly = searchParams.get('stage') === '1';
  const badgesOnly = searchParams.get('badges') === '1';
  const referenceMode = searchParams.get('reference') === '1';
  const [screen, setScreen] = useState<Screen>('训练');
  const [themeId, setThemeId] = useState<ThemeId>('pet');
  const requestedTheme = getTheme(searchParams.get('theme') as ThemeId);
  const theme = stageOnly && requestedTheme ? requestedTheme : getTheme(themeId)!;
  const [snapshot, setSnapshot] = useState(initial);
  const engine = useRef<MockTrainingEngine | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [tracked, setTracked] = useState(false);
  const [poseIndex, setPoseIndex] = useState(0);
  const [aborted, setAborted] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [auraAdjust, setAuraAdjust] = useState(false);
  const currentPose: Exclude<Pose, 'UNKNOWN'> = (['STRAIGHT', 'HOOK', 'FIST'] as const)[poseIndex];
  const referenceSnapshot: TrainingSnapshot = { ...initial, status: 'PLAYING', mediaMs: 10_000, currentTaskIndex: 3, currentPose: 'STRAIGHT', nextPose: 'HOOK', tracking: 'GOOD', recognizedPose: 'STRAIGHT', holdProgress: .5, latestGrade: { taskId: 'reference-preview', grade: 'GOOD', nonce: 1 }, confirmed: { completed: 3, judged: 3, perfect: 1, good: 2, miss: 0 } };
  useEffect(() => {
    const mock = new MockTrainingEngine(); engine.current = mock;
    const unsubscribe = mock.subscribe(setSnapshot);
    const onVisibility = () => { if (document.hidden) mock.pause('BACKGROUND'); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { unsubscribe(); mock.dispose(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [themeId]);
  useEffect(() => { if (snapshot.status === 'COMPLETED') { setAborted(false); setScreen('结果'); } }, [snapshot.status]);
  useEffect(() => {
    if (snapshot.status !== 'COUNTDOWN') return;
    setCountdown(3); const timer = setInterval(() => setCountdown(n => Math.max(1, n - 1)), 1000); return () => clearInterval(timer);
  }, [snapshot.status]);
  const summary: SessionSummary = { id: 'design-preview-only', themeId, protocolId: 'tendon-a-demo-v1', manifestVersion: 'design-v2', ruleVersion: 'design-v2', status: aborted ? 'ABORTED' : 'COMPLETED', plannedTasks: 30, completedTasks: aborted ? 5 : 26, perfect: aborted ? 3 : 18, good: aborted ? 2 : 8, miss: aborted ? 0 : 4, judgedTasks: aborted ? 5 : 30, activeDurationMs: aborted ? 31000 : 90000, plannedDurationMs: 90000, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), syncState: 'LOCAL_ONLY' };
  function selectScreen(value: Screen) { if (value !== '训练') engine.current?.pause('USER'); setScreen(value); }
  if (badgesOnly) return <div className="standalone-badge-preview"><section className="gesture-badge-showcase" aria-label="三个手势图标大尺寸预览"><GestureBadge pose="STRAIGHT" active size="preview" /><ArrowRight /><GestureBadge pose="HOOK" size="preview" /><ArrowRight /><GestureBadge pose="FIST" size="preview" /></section><p>界面提示图标 · 非医学动作教学标准</p></div>;
  if (stageOnly) return <div className={`standalone-training-preview ${referenceMode ? 'reference-capture' : ''}`}><TrainingStage theme={theme} assets={getThemeAssets(theme.id)} backgroundImageUrl={assetUrl(getThemeAssets(theme.id).backgroundImage)} musicUrl={assetUrl(getThemeAssets(theme.id).musicUrl)} snapshot={referenceMode ? referenceSnapshot : snapshot} preview countdown={countdown} onStart={() => engine.current?.start()} onPause={() => engine.current?.pause('USER')} onResume={() => engine.current?.resume()} onAbort={() => engine.current?.reset()} /></div>;
  return <div className="design-workspace"><header className="design-header"><Brand /><span>界面与交互预览 <i>DEV ONLY</i></span><Link to="/" className="back-link"><ArrowLeft size={16} /> 返回应用</Link></header><div className="design-layout"><aside className="design-controls"><div className="design-label">页面状态</div><nav aria-label="设计预览页面">{screens.map(value => <button key={value} className={screen === value ? 'selected' : ''} onClick={() => selectScreen(value)}>{value}<ChevronRight size={15} /></button>)}</nav><div className="design-label">主题</div><div className="design-theme-select">{themes.map(t => <button key={t.id} aria-pressed={themeId === t.id} onClick={() => setThemeId(t.id)}><i style={{ background: t.accent }} />{t.name}</button>)}</div>
      {screen === '训练' && <><div className="design-label">切换反馈</div><div className="design-grade-buttons">{(['PERFECT', 'GOOD', 'MISS'] as Grade[]).map(g => <button key={g} onClick={() => engine.current?.feedback(g)}>{g === 'PERFECT' ? 'Perfect' : g === 'GOOD' ? 'Good' : 'Miss'}</button>)}</div><div className="design-label">识别与恢复</div><div className="design-state-buttons"><button onClick={() => setAuraAdjust(!auraAdjust)}>{auraAdjust ? '手回到中央' : '短暂不稳定'}</button><button onClick={() => { setAuraAdjust(false); engine.current?.pause('HAND_LOST'); }}>手部丢失</button><button onClick={() => engine.current?.resume()}>找回手部 · 倒数</button><button onClick={() => engine.current?.pause('MEDIA')}>媒体等待</button><button onClick={() => engine.current?.pause('BACKGROUND')}>回到前台</button><button onClick={() => { setAborted(false); engine.current?.pause('USER'); setScreen('结果'); }}>查看训练完成</button><button onClick={() => engine.current?.reset()}><RotateCcw size={14} />重置预览</button></div></>}
      {screen === '校准' && <button className="secondary-button" onClick={() => setTracked(!tracked)}>{tracked ? '等待手部' : '预览已准备'}</button>}
      {screen === '结果' && <button className="secondary-button" onClick={() => setAborted(!aborted)}>{aborted ? '查看完成状态' : '查看未完成状态'}</button>}
      {screen === '历史' && <button className="secondary-button" onClick={() => setShowHistory(!showHistory)}>{showHistory ? '查看空状态' : '查看示例记录'}</button>}
      <p className="design-disclosure">这里使用开发模拟数据和真实主题背景，仅供检查视觉与交互；不识别、不打卡、不保存记录。正式训练使用现有识别引擎。</p><Link to="/prepare/pet" className="text-button">查看真实准备流程 <ArrowRight size={14} /></Link><Link to="/binding" className="text-button">查看绑定页面 <ArrowRight size={14} /></Link></aside>
      <main className={`design-canvas canvas-${screen}`}><p className="design-canvas-caption">{theme.name} <span>/</span> {screen} <span>·</span> 设计预览</p>
        {screen === '训练' && <div className={`design-phone ${auraAdjust ? 'preview-adjust' : ''}`}><TrainingStage theme={theme} assets={getThemeAssets(theme.id)} backgroundImageUrl={assetUrl(getThemeAssets(theme.id).backgroundImage)} musicUrl={assetUrl(getThemeAssets(theme.id).musicUrl)} snapshot={snapshot} preview countdown={countdown} onStart={() => engine.current?.start()} onPause={() => engine.current?.pause('USER')} onResume={() => engine.current?.resume()} onAbort={() => { engine.current?.pause('USER'); setAborted(true); setScreen('结果'); }} />{auraAdjust && <div className="adjust-message" role="status">让手保持在画面里</div>}</div>}
        {screen === '图标' && <section className="gesture-badge-showcase" aria-label="三个手势图标大尺寸预览"><GestureBadge pose="STRAIGHT" active size="preview" /><ArrowRight /><GestureBadge pose="HOOK" size="preview" /><ArrowRight /><GestureBadge pose="FIST" size="preview" /></section>}
        {screen === '加载' && <div className="design-phone loading-phone"><RippleLoading /></div>}
        {screen === '校准' && <div className="design-phone preview-preparation" style={themeStyle(theme)}><div className="preview-step-label">03 / 05 <span>取景校准</span></div><p className="eyebrow">找到一个舒服的位置</p><h1>{tracked ? '看到你了，保持一下' : '把手放进这里'}</h1><p>手掌面向镜头，让整只手完整入镜。</p><div className={`camera-frame demo-camera ${tracked ? 'is-tracked' : ''}`}><div className="camera-placeholder"><Hand size={110} strokeWidth={.7} /><span>摄像头画面占位</span></div><div className="camera-guide"><span>{tracked ? <><Check size={16} /> 已准备</> : '手放在这里'}</span></div><span className="camera-label">设计示例 · 未开启摄像头</span></div><div className="recognition-hint"><span className="tiny-beat" />{tracked ? '已准备，马上开始动作教学' : '把一只手完整放进画面'}</div><button className="primary-button wide" onClick={() => { setPoseIndex(0); setScreen('教学'); }}>预览动作教学 <ArrowRight size={16} /></button></div>}
        {screen === '教学' && <div className="design-phone preview-preparation" style={themeStyle(theme)}><div className="tutorial-top"><span>动作 {poseIndex + 1} / 3</span><button className="text-button" onClick={() => { setScreen('训练'); engine.current?.reset(); }}>跳过示范<ChevronRight size={15} /></button></div><p className="eyebrow">给双手，一点舒展的空间</p><h1>{poseInfo[currentPose].name}</h1><p>{poseInfo[currentPose].hint}</p><div className="tutorial-demonstration"><GestureTeachingMedia pose={currentPose} /></div><div className="demo-tutorial-hint"><span className="tiny-beat" />试着做一次{poseInfo[currentPose].name}</div><div className="tutorial-dots">{[0, 1, 2].map(i => <span key={i} className={i <= poseIndex ? 'active' : ''} />)}</div><button className="primary-button wide" onClick={() => { if (poseIndex < 2) setPoseIndex(poseIndex + 1); else { setScreen('训练'); engine.current?.reset(); } }}>{poseIndex < 2 ? '预览下一个动作' : '预览准备完成'}<ArrowRight size={17} /></button><p className="micro-note">正式流程中仍需识别确认，不能跳过校准</p></div>}
        {screen === '结果' && <div className="design-result"><ResultSummary summary={summary} preview /></div>}
        {screen === '历史' && <div className="design-history"><h1>把每一小步，留在这里</h1><p>设计示例 · 未写入本机记录</p><HistoryContent records={showHistory ? [summary] : []} preview /></div>}
      </main></div></div>;
}
