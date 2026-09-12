import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { ArrowLeft, Pause, Play, Volume2 } from 'lucide-react';
import type { Pose, TrainingSnapshot } from '../../contracts';
import type { VisualTheme } from '../../theme/themeConfig';
import { assetUrl, poseInfo, themeStyle } from '../../theme/themeConfig';
import { GESTURE_ASSETS, type ThemeAssets } from '../../config/assets';
import { PoseIcon } from '../../components/PoseIcon';
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
    <div className="track-label"><strong>跟随节拍</strong><span>每格 3 秒</span></div>
    <div className="track-lane">
      <div className="judge-line"><span>判定</span></div>
      {notes.map(index => {
        const pose = TRAINING_POSES[index % TRAINING_POSES.length];
        const x = 25 + ((index * TASK_WINDOW_MS - snapshot.mediaMs) / TASK_WINDOW_MS) * 24;
        return <div key={index} className={`track-note pose-${pose.toLowerCase()}`} style={{ left: `${x}%` }}>
          <span className="note-head"><PoseIcon pose={pose} /><small>{poseInfo[pose].name}</small></span>
          <span className="note-tail" />
        </div>;
      })}
    </div>
  </section>;
}

function GestureGuide({ current, next, hand }: { current: TrainingPose; next?: Pose; hand: 'LEFT' | 'RIGHT' }) {
  const media = GESTURE_ASSETS[current];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [current]);
  const showVideo = Boolean(media.videoUrl && !failed);
  const showImage = Boolean(media.imageUrl && !failed && !showVideo);
  return <section className="gesture-guide" aria-label="当前动作教学">
    <div className={`gesture-media ${hand === 'LEFT' ? 'show-left' : ''}`}>
      {showVideo && <video key={current} src={assetUrl(media.videoUrl!)} autoPlay muted loop playsInline onError={() => setFailed(true)} />}
      {showImage && <img src={assetUrl(media.imageUrl!)} alt={`${poseInfo[current].name}教学姿势`} onError={() => setFailed(true)} />}
      {!showVideo && !showImage && <><PoseIcon pose={current} /><small>动作示意 · 正式教学素材待专业审核</small></>}
    </div>
    <div className="gesture-copy"><span>当前动作</span><h1>{poseInfo[current].name}</h1><p>{poseInfo[current].hint}</p></div>
    {next && next !== 'UNKNOWN' && <div className="next-gesture"><span>下一动作</span><PoseIcon pose={next} /><strong>{poseInfo[next].name}</strong></div>}
  </section>;
}

function CameraPreview({ stream, snapshot }: { stream?: MediaStream; snapshot: TrainingSnapshot }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream ?? null;
    if (stream) void ref.current.play().catch(() => {});
    return () => { if (ref.current) ref.current.srcObject = null; };
  }, [stream]);
  const correct = snapshot.tracking === 'GOOD' && snapshot.recognizedPose === snapshot.currentPose;
  const message = snapshot.tracking === 'LOST' ? '手部未跟踪' : snapshot.tracking === 'ADJUST' ? '请调整取景位置' : snapshot.recognizedPose === 'UNKNOWN' ? '请稍微调整手型' : correct ? `已识别：${poseInfo[snapshot.recognizedPose].name}` : `当前目标：${poseInfo[snapshot.currentPose].name}`;
  return <div className={`training-camera ${correct ? 'is-correct' : ''}`}>
    <div><video ref={ref} muted playsInline aria-label="训练中的镜像摄像头预览" />{!stream && <span>摄像头未连接</span>}</div>
    <p><i />{message}</p>
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
  const grade = snapshot.currentRhythmGrade ?? snapshot.latestGrade?.grade;
  const holdLabel = snapshot.holdCompleted ? '保持完成' : snapshot.holdProgress > 0 ? '正在累计正确保持' : '等待正确动作';
  return <section className={`training-stage theme-${theme.id} status-${snapshot.status.toLowerCase()} ${preview ? 'is-preview' : ''}`} style={{ ...themeStyle(theme), '--surround-color': assets.surroundColor } as CSSProperties} aria-label={`${theme.name}训练`}>
    <img className="theme-background" src={backgroundImageUrl} alt="" />
    <video className={`theme-background theme-background-video ${!videoUrl || videoFailed ? 'is-hidden' : ''}`} ref={videoRef} src={videoUrl} muted loop playsInline preload={videoUrl ? 'metadata' : 'none'} onError={() => setVideoFailed(true)} aria-label={`${theme.name}无声背景视频`} />
    <audio ref={audioRef} src={musicUrl} preload={musicUrl ? 'auto' : 'none'} onError={() => setAudioFailed(true)} onCanPlay={() => setAudioFailed(false)} />
    <Decorations kind={assets.decoration} />
    <div className="stage-shade" />
    <header className="training-hud">
      <div><strong>{theme.name}</strong><span>{formatTime(elapsed)} / 01:30</span></div>
      <button className="icon-button pause-button" onClick={onPause} disabled={snapshot.status !== 'PLAYING'} aria-label="暂停训练"><Pause size={20} /></button>
      <div className="total-progress" aria-label={`总进度 ${Math.round(elapsed / TRAINING_DURATION_MS * 100)}%`}><i style={{ width: `${elapsed / TRAINING_DURATION_MS * 100}%` }} /></div>
    </header>
    {preview && <span className="preview-watermark">设计预览 · 开发模拟数据</span>}
    <main className="training-interface">
      <RhythmTrack snapshot={snapshot} />
      <GestureGuide current={snapshot.currentPose as TrainingPose} next={snapshot.nextPose} hand={hand} />
      <section className="performance-feedback" aria-label="本动作反馈">
        <div className={`rhythm-result ${grade ? `grade-${grade.toLowerCase()}` : ''}`}><span>节奏评价</span><strong>{grade ? (grade === 'PERFECT' ? 'Perfect' : grade === 'GOOD' ? 'Good' : 'Miss') : '等待到达'}</strong><small>到达时机独立判定</small></div>
        <div className={`hold-result ${snapshot.holdCompleted ? 'is-complete' : ''}`}><span>{holdLabel}</span><strong>{Math.round(snapshot.holdProgress * 2_000 / 100) / 10}<small> / 2.0 秒</small></strong><div><i style={{ width: `${snapshot.holdProgress * 100}%` }} /></div><small>仅正确手型累计</small></div>
      </section>
      <footer className="training-bottom"><CameraPreview stream={cameraStream} snapshot={snapshot} /><div className="task-counter"><span>第 <strong>{snapshot.currentTaskIndex + 1}</strong> / 30 个动作</span><div>{TRAINING_POSES.map((pose, index) => <span key={pose} className={index === snapshot.currentTaskIndex % 3 ? 'active' : ''}><PoseIcon pose={pose} /><small>{poseInfo[pose].name}</small></span>)}</div><small>{audioFailed ? '音乐加载失败 · 训练仍可继续' : `${theme.name}主题音乐`}</small></div></footer>
    </main>
    {snapshot.latestGrade && snapshot.status === 'PLAYING' && <div key={snapshot.latestGrade.nonce} className={`feedback-pop grade-${snapshot.latestGrade.grade.toLowerCase()}`} role="status">{snapshot.latestGrade.grade === 'PERFECT' ? 'Perfect' : snapshot.latestGrade.grade === 'GOOD' ? 'Good' : 'Miss'}<small>{snapshot.latestHold?.completed ? ' · 保持完成' : ' · 保持不足'}</small></div>}
    {snapshot.status === 'READY' && <div className="stage-overlay"><span className="overlay-kicker">{theme.name} · 90 秒 · 30 个动作</span><h1>准备好，就开始吧</h1><p>倒数不计入训练时间；第一动作会提前显示。</p><button className="primary-button" onClick={onStart}><Play size={17} /> 开始训练</button>{onBack && <button className="text-button" onClick={onBack}><ArrowLeft size={16} /> 返回准备</button>}<span className="test-audio-note"><Volume2 size={15} /> {audioFailed ? '主题音乐加载失败，训练仍可继续' : '主题音乐将在倒数结束后同步播放'}</span></div>}
    {snapshot.status === 'COUNTDOWN' && <div className="stage-overlay countdown-overlay"><span className="overlay-kicker">{reason ? '重新开始当前 3 秒动作' : `第一个动作：${poseInfo[snapshot.currentPose].name}`}</span><span className="countdown-number" key={countdown} role="status">{countdown}</span><p>倒数结束时音符抵达判定线</p></div>}
    {paused && <div className={`stage-overlay pause-overlay ${lost ? 'recovery-overlay' : ''}`}><div className="overlay-symbol">{lost ? <PoseIcon /> : <Pause size={33} strokeWidth={1.2} />}</div><span className="overlay-kicker">{lost ? '识别已暂停计时' : '训练时间轴已冻结'}</span><h1>{lost ? '把手放回取景框' : reason === 'MEDIA' ? '背景媒体暂不可用' : reason === 'BACKGROUND' ? '欢迎回来' : '休息一下'}</h1><p>{lost ? '稳定识别后会倒数并重播当前动作。' : '继续后会从当前 3 秒动作重新开始，临时结果不会重复计分。'}</p>{lost ? <div className="recovery-wait" role="status"><span className="tiny-beat" /> 正在等待识别恢复</div> : <button className="primary-button" onClick={onResume}><Play size={17} /> 继续训练</button>}<button className="text-button exit-training" onClick={onAbort}>退出训练</button><small>退出后保留已完成动作，且不计入打卡</small></div>}
    {message && <div className="stage-message" role="alert">{message}</div>}
  </section>;
}
