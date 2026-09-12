import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { ArrowLeft, ArrowRight, Flower2, Leaf, Pause, PawPrint, Play, Sparkles, Volume2 } from 'lucide-react';
import type { Pose, TrainingSnapshot } from '../../contracts';
import type { VisualTheme } from '../../theme/themeConfig';
import { assetUrl, poseInfo, themeStyle } from '../../theme/themeConfig';
import { GESTURE_ASSETS, type ThemeAssets } from '../../config/assets';
import { PoseIcon } from '../../components/PoseIcon';
import { GestureBadge } from '../../components/GestureBadge';
import { TASK_WINDOW_MS, TRAINING_DURATION_MS, TRAINING_POSES, TRAINING_TASK_COUNT } from '../../services/trainingRules';

type TrainingPose = Exclude<Pose, 'UNKNOWN'>;

export function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function RhythmTrack({ snapshot }: { snapshot: TrainingSnapshot }) {
  const first = Math.max(0, snapshot.currentTaskIndex - 1);
  const last = Math.min(TRAINING_TASK_COUNT - 1, snapshot.currentTaskIndex + 3);
  const notes = Array.from({ length: last - first + 1 }, (_, offset) => first + offset);
  return <section className="rhythm-track" aria-label="节奏轨道">
    <div className="track-label"><strong>到线换动作 · 长条内保持</strong></div>
    <div className="track-viewport">
      <div className="track-lane" />
      <div className="judge-line" aria-hidden="true" />
      {notes.map(index => {
        const pose = TRAINING_POSES[index % TRAINING_POSES.length];
        const x = 25 + ((index * TASK_WINDOW_MS - snapshot.mediaMs) / TASK_WINDOW_MS) * 24;
        return <div key={index} className={`track-note pose-${pose.toLowerCase()}`} style={{ left: `${x}%` }}>
          <span className="note-tail" />
          <GestureBadge pose={pose} active={index === snapshot.currentTaskIndex} size="track" showLabel={false} />
        </div>;
      })}
    </div>
  </section>;
}

function ThemeMark({ themeId }: { themeId: VisualTheme['id'] }) {
  if (themeId === 'garden') return <Flower2 aria-hidden="true" />;
  if (themeId === 'space') return <Sparkles aria-hidden="true" />;
  return <PawPrint aria-hidden="true" />;
}

function ThemeFlourish({ themeId, reverse = false }: { themeId: VisualTheme['id']; reverse?: boolean }) {
  const icon = themeId === 'pet' ? <PawPrint /> : themeId === 'space' ? <Sparkles /> : <Leaf />;
  return <span className={reverse ? 'is-reversed' : ''} aria-hidden="true">{icon}</span>;
}

function GestureGuide({ current, hand, themeId }: { current: TrainingPose; hand: 'LEFT' | 'RIGHT'; themeId: VisualTheme['id'] }) {
  const media = GESTURE_ASSETS[current];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [current]);
  const showVideo = Boolean(media.videoUrl && !failed);
  const showImage = Boolean(media.imageUrl && !failed && !showVideo);
  return <section className="gesture-guide" aria-label="当前动作教学">
    <header className="gesture-copy"><div className="gesture-title"><ThemeFlourish themeId={themeId} /><h1>{poseInfo[current].name}</h1><ThemeFlourish themeId={themeId} reverse /></div><p>{poseInfo[current].hint}</p></header>
    <div className={`gesture-media ${hand === 'LEFT' ? 'show-left' : ''}`}>
      {showVideo && <video key={current} src={assetUrl(media.videoUrl!)} autoPlay muted loop playsInline onError={() => setFailed(true)} />}
      {showImage && <img src={assetUrl(media.imageUrl!)} alt={`${poseInfo[current].name}教学姿势`} onError={() => setFailed(true)} />}
      {!showVideo && !showImage && <span className="gesture-empty" role="img" aria-label={`${poseInfo[current].name}教学素材待接入`}>空白</span>}
    </div>
  </section>;
}

function recognitionFeedback(snapshot: TrainingSnapshot) {
  const correct = snapshot.tracking === 'GOOD' && snapshot.recognizedPose === snapshot.currentPose;
  if (snapshot.tracking === 'LOST') return { tone: 'lost', message: '手部未跟踪，请把手放回取景框' };
  if (snapshot.tracking === 'ADJUST') return { tone: 'adjust', message: '已看到手，请调整取景位置' };
  if (snapshot.recognizedPose === 'UNKNOWN') return { tone: 'unknown', message: '请稍微调整手型' };
  if (correct) return { tone: 'correct', message: `已识别：${poseInfo[snapshot.recognizedPose].name}` };
  return { tone: 'wrong', message: `识别为${poseInfo[snapshot.recognizedPose].name}，当前目标：${poseInfo[snapshot.currentPose].name}` };
}

function CameraPreview({ stream, snapshot }: { stream?: MediaStream; snapshot: TrainingSnapshot }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream ?? null;
    if (stream) void ref.current.play().catch(() => {});
    return () => { if (ref.current) ref.current.srcObject = null; };
  }, [stream]);
  const feedback = recognitionFeedback(snapshot);
  return <div className={`training-camera state-${feedback.tone}`}>
    <strong>我的手</strong>
    <div><video ref={ref} muted playsInline aria-label="训练中的镜像摄像头预览" />{!stream && <span>摄像头未连接</span>}</div>
    <p><i />{feedback.message}</p>
  </div>;
}

function Decorations({ kind }: { kind: ThemeAssets['decoration'] }) {
  if (kind === 'petals') return <div className="theme-decoration petals" aria-hidden="true"><i /><i /><i /><i /></div>;
  if (kind === 'stars') return <div className="theme-decoration stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>;
  return null;
}

export function TrainingStage({ theme, assets, snapshot, onPause, onResume, onAbort, onStart, onBack, videoRef, videoUrl, audioRef, musicUrl, backgroundImageUrl, cameraStream, hand = 'RIGHT', preview = false, countdown = 3, message }: {
  theme: VisualTheme; assets: ThemeAssets; snapshot: TrainingSnapshot; onPause: () => void; onResume: () => void; onAbort: () => void; onStart?: () => void; onBack?: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>; videoUrl?: string; audioRef?: RefObject<HTMLAudioElement | null>; musicUrl?: string; backgroundImageUrl: string; cameraStream?: MediaStream; hand?: 'LEFT' | 'RIGHT'; preview?: boolean; countdown?: number; message?: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  useEffect(() => setAudioFailed(false), [musicUrl]);
  const paused = snapshot.status === 'PAUSED';
  const lost = snapshot.pauseReason === 'HAND_LOST';
  const reason = snapshot.pauseReason;
  const elapsed = Math.min(TRAINING_DURATION_MS, snapshot.mediaMs);
  const grade = snapshot.latestGrade?.grade;
  const recognition = recognitionFeedback(snapshot);
  const progress = elapsed / TRAINING_DURATION_MS * 100;
  const gradeLabel = grade ? (grade === 'PERFECT' ? 'Perfect' : grade === 'GOOD' ? 'Good' : 'Miss') : '';
  return <section className={`training-stage theme-${theme.id} status-${snapshot.status.toLowerCase()} ${preview ? 'is-preview' : ''}`} style={{ ...themeStyle(theme), '--surround-color': assets.surroundColor } as CSSProperties} aria-label={`${theme.name}训练`}>
    <img className="theme-background" src={backgroundImageUrl} alt="" />
    <video className={`theme-background theme-background-video ${!videoUrl || videoFailed ? 'is-hidden' : ''}`} ref={videoRef} src={videoUrl} muted loop playsInline preload={videoUrl ? 'metadata' : 'none'} onError={() => setVideoFailed(true)} aria-label={`${theme.name}无声背景视频`} />
    <audio ref={audioRef} src={musicUrl} preload={musicUrl ? 'auto' : 'none'} onError={() => setAudioFailed(true)} onCanPlay={() => setAudioFailed(false)} />
    <Decorations kind={assets.decoration} />
    <div className="stage-shade" />
    <header className="training-title"><ThemeMark themeId={theme.id} /><div><strong>{theme.name}</strong><span><ThemeFlourish themeId={theme.id} />节奏康复<ThemeFlourish themeId={theme.id} reverse /></span></div></header>
    <button className="icon-button pause-button" onClick={onPause} disabled={snapshot.status !== 'PLAYING'} aria-label="暂停训练"><Pause /></button>
    <section className="training-progress-status" aria-label={`总进度 ${Math.round(progress)}%`}><div><span>{formatTime(elapsed)} / 01:30</span><strong>{Math.round(progress)}%</strong></div><div className="total-progress"><i style={{ width: `${progress}%` }} /></div></section>
    {preview && <span className="preview-watermark">设计预览 · 开发模拟数据</span>}
    <main className="training-interface">
      <RhythmTrack snapshot={snapshot} />
      <GestureGuide current={snapshot.currentPose as TrainingPose} hand={hand} themeId={theme.id} />
      <section className="performance-feedback" aria-label="本动作反馈">
        <div className={`rhythm-result ${grade ? `rhythm-grade-${grade.toLowerCase()}` : 'is-waiting'}`} aria-live="polite"><strong key={snapshot.latestGrade?.nonce}>{gradeLabel}</strong></div>
        <div className={`hold-result state-${recognition.tone} ${snapshot.holdCompleted ? 'is-complete' : ''}`}><span>正确保持</span><div className="hold-progress"><i style={{ width: `${snapshot.holdProgress * 100}%` }} /></div><strong>{Math.round(snapshot.holdProgress * 2_000 / 100) / 10} / 2.0 秒</strong></div>
      </section>
      <footer className="training-bottom"><CameraPreview stream={cameraStream} snapshot={snapshot} /><div className="task-counter"><span>第 <strong>{snapshot.currentTaskIndex + 1}</strong> / 30 个动作</span><div className="gesture-sequence">{TRAINING_POSES.flatMap((pose, index) => [<GestureBadge pose={pose} active={index === snapshot.currentTaskIndex % 3} key={pose} />, ...(index < TRAINING_POSES.length - 1 ? [<ArrowRight className="sequence-arrow" aria-hidden="true" key={`${pose}-arrow`} />] : [])])}</div></div></footer>
    </main>
    <p className="training-footnote"><ThemeFlourish themeId={theme.id} />跟随练习 · 成绩不代表疗效<ThemeFlourish themeId={theme.id} reverse /></p>
    {snapshot.status === 'READY' && <div className="stage-overlay"><span className="overlay-kicker">{theme.name} · 90 秒 · 30 个动作</span><h1>准备好，就开始吧</h1><p>倒数不计入训练时间；第一动作会提前显示。</p><button className="primary-button" onClick={onStart}><Play size={17} /> 开始训练</button>{onBack && <button className="text-button" onClick={onBack}><ArrowLeft size={16} /> 返回准备</button>}<span className="test-audio-note"><Volume2 size={15} /> {audioFailed ? '主题音乐加载失败，训练仍可继续' : '主题音乐将在倒数结束后同步播放'}</span></div>}
    {snapshot.status === 'COUNTDOWN' && <div className="stage-overlay countdown-overlay"><span className="overlay-kicker">{reason ? '重新开始当前 3 秒动作' : `第一个动作：${poseInfo[snapshot.currentPose].name}`}</span><span className="countdown-number" key={countdown} role="status">{countdown}</span><p>倒数结束时音符抵达判定线</p></div>}
    {paused && <div className={`stage-overlay pause-overlay ${lost ? 'recovery-overlay' : ''}`}><div className="overlay-symbol">{lost ? <PoseIcon /> : <Pause size={33} strokeWidth={1.2} />}</div><span className="overlay-kicker">{lost ? '识别已暂停计时' : '训练时间轴已冻结'}</span><h1>{lost ? '把手放回取景框' : reason === 'MEDIA' ? '背景媒体暂不可用' : reason === 'BACKGROUND' ? '欢迎回来' : '休息一下'}</h1><p>{lost ? '稳定识别后会倒数并重播当前动作。' : '继续后会从当前 3 秒动作重新开始，临时结果不会重复计分。'}</p>{lost ? <div className="recovery-wait" role="status"><span className="tiny-beat" /> 正在等待识别恢复</div> : <button className="primary-button" onClick={onResume}><Play size={17} /> 继续训练</button>}<button className="text-button exit-training" onClick={onAbort}>退出训练</button><small>退出后保留已完成动作，且不计入打卡</small></div>}
    {message && <div className="stage-message" role="alert">{message}</div>}
  </section>;
}
