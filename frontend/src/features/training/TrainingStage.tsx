import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { ArrowLeft, Check, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import type { TrainingSnapshot } from '../../contracts';
import type { VisualTheme } from '../../theme/themeConfig';
import { poseInfo, posterUrl, themeStyle } from '../../theme/themeConfig';
import { PoseIcon } from '../../components/PoseIcon';
import { getRuntime } from '../../services/runtime';

export function formatTime(ms: number) { const seconds = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }

export function HandAura({ snapshot, preview = false }: { snapshot: TrainingSnapshot; preview?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (preview) return;
    return getRuntime().subscribeAura?.(({ x, y, scale, rotation, tracking }) => {
      if (!ref.current) return;
      const node = ref.current;
      // Normalized camera-to-stage coordinates are supplied by the adapter; visual smoothing only.
      node.style.left = `${Math.max(18, Math.min(82, x * 100))}%`;
      node.style.top = `${Math.max(26, Math.min(77, y * 100))}%`;
      node.style.transform = `translate(-50%, -50%) scale(${Math.max(.6, Math.min(1.4, scale))}) rotate(${Math.max(-22, Math.min(22, rotation))}deg)`;
      node.dataset.tracking = tracking;
      node.dataset.gradePlacement = y < .37 ? 'below' : 'above';
    });
  }, [preview]);
  const grade = snapshot.latestGrade;
  const hidden = snapshot.status === 'PAUSED' && snapshot.pauseReason === 'HAND_LOST';
  return <div ref={ref} className={`hand-aura ${hidden ? 'aura-lost' : ''}`} aria-label={`动作保持进度${Math.round(snapshot.holdProgress * 100)}%`}>
    {grade && snapshot.status === 'PLAYING' && <div key={grade.nonce} className={`grade-feedback grade-${grade.grade.toLowerCase()}`} role="status"><span>{grade.grade === 'PERFECT' ? 'Perfect' : grade.grade === 'GOOD' ? 'Good' : 'Miss'}</span>{grade.grade === 'MISS' && <small>下一拍继续</small>}<i /></div>}
    <svg viewBox="0 0 220 246" className="aura-outline" fill="none" aria-hidden="true"><path className="aura-envelope" d="M58 211C34 189 28 149 31 117C35 70 54 35 89 29C134 18 172 46 185 90C195 128 194 168 168 200C142 233 88 235 58 211Z" /><circle className="hold-track" cx="110" cy="128" r="104" /><circle className="hold-ring" cx="110" cy="128" r="104" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - Math.max(0, Math.min(1, snapshot.holdProgress))} /></svg>
    <div className="aura-center"><span /><span /><span /></div><span className="aura-adjust-hint">稍微往中间一点</span>{snapshot.holdProgress > 0 && <span className="hold-label">{snapshot.holdProgress >= 1 ? <><Check size={14} /> 动作完成</> : '保持一下'}</span>}
  </div>;
}

export function TrainingStage({ theme, snapshot, onPause, onResume, onAbort, onStart, onBack, videoRef, videoUrl, preview = false, countdown = 3, message }: {
  theme: VisualTheme; snapshot: TrainingSnapshot; onPause: () => void; onResume: () => void; onAbort: () => void; onStart?: () => void; onBack?: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>; videoUrl?: string; preview?: boolean; countdown?: number; message?: string;
}) {
  const paused = snapshot.status === 'PAUSED';
  const lost = snapshot.pauseReason === 'HAND_LOST';
  const cueVisible = snapshot.status === 'PLAYING' && snapshot.mediaMs % 6000 < 2300;
  const reason = snapshot.pauseReason;
  return <section className={`training-stage ${preview ? 'is-preview' : ''}`} style={themeStyle(theme)} aria-label={`${theme.name}训练`}>
    {videoUrl ? <video className="theme-video" ref={videoRef} src={videoUrl} poster={posterUrl(theme.id)} playsInline preload="auto" aria-label={`${theme.name}情境视频`} /> : <img className="theme-video" src={posterUrl(theme.id)} alt={`${theme.name}主题场景`} />}
    <div className="stage-shade" />
    <div className="training-hud"><span className="time-chip"><span />{formatTime(90000 - snapshot.mediaMs)}</span><button className="icon-button pause-button" onClick={onPause} disabled={snapshot.status !== 'PLAYING'} aria-label="暂停训练"><Pause size={20} /></button></div>
    {preview && <span className="preview-watermark">设计预览 · 开发模拟数据</span>}
    <HandAura snapshot={snapshot} preview={preview} />
    <div className={`action-cue ${cueVisible ? 'cue-visible' : ''}`} aria-hidden={!cueVisible}><PoseIcon pose={snapshot.currentPose} /><div><span>下一个节拍</span><h2>{poseInfo[snapshot.currentPose].name}</h2></div><span className="cue-beats"><i /><i /><i /></span></div>
    {snapshot.status === 'PLAYING' && !cueVisible && <span className="quiet-stage-hint">按自己的节奏，轻轻保持</span>}
    {snapshot.status === 'READY' && <div className="stage-overlay"><span className="overlay-kicker">{theme.name} · 90 秒</span><h1>准备好，就开始吧</h1><p>打开声音，让音乐带着你。</p><button className="primary-button" onClick={onStart}><Play size={17} /> 开始训练</button>{onBack && <button className="text-button" onClick={onBack}><ArrowLeft size={16} /> 返回准备</button>}<Volume2 className="overlay-volume" size={19} /></div>}
    {snapshot.status === 'COUNTDOWN' && <div className="stage-overlay countdown-overlay"><span className="overlay-kicker">{reason ? '重新开始这个动作' : '跟着音乐，动动手'}</span><span className="countdown-number" key={countdown} role="status">{countdown}</span><p>放轻松，我们慢慢来</p></div>}
    {paused && <div className={`stage-overlay pause-overlay ${lost ? 'recovery-overlay' : ''}`}><div className="overlay-symbol">{lost ? <PoseIcon /> : reason === 'MEDIA' ? <span className="media-pause-dots">···</span> : <Pause size={33} strokeWidth={1.2} />}</div><span className="overlay-kicker">{lost ? '让我们重新找到彼此' : '休息一下，也很好'}</span><h1>{lost ? '没看到手' : reason === 'MEDIA' ? '训练内容暂停加载' : reason === 'BACKGROUND' ? '欢迎回来' : '把节奏，留在这里'}</h1><p>{lost ? '把手放回画面中' : reason === 'MEDIA' ? '内容准备好后，再从这个动作开始。' : reason === 'BACKGROUND' ? '准备好后，我们重新开始这个动作。' : '准备好了，就继续这段小小的旅程。'}</p>{lost ? <div className="recovery-wait" role="status"><span className="tiny-beat" /> 正在等待你的手</div> : <button className="primary-button" onClick={onResume}><Play size={17} /> 继续训练</button>}<button className="text-button exit-training" onClick={onAbort}>退出训练</button><small>退出后本次不会计入打卡</small></div>}
    {message && <div className="stage-message" role="alert">{message}</div>}
  </section>;
}
