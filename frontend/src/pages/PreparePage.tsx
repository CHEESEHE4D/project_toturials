import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, ChevronRight, Hand, LockKeyhole, ShieldCheck, Smartphone, Sun, Volume2 } from 'lucide-react';
import { AppShell, Notice } from '../components/Layout';
import { PoseIcon } from '../components/PoseIcon';
import { GestureTeachingMedia } from '../components/GestureTeachingMedia';
import { assetUrl, getTheme, poseInfo, posterUrl, themeStyle } from '../theme/themeConfig';
import { endCameraSession, getRuntime, preparationSession } from '../services/runtime';
import type { Pose, RecognitionState } from '../contracts';
import { loadManifest } from '../services/manifest';
import { getThemeAssets } from '../config/assets';

const steps = ['摄像头说明', '选择训练手', '取景校准', '动作教学', '准备完成'];
const poses: Exclude<Pose, 'UNKNOWN'>[] = ['STRAIGHT', 'HOOK', 'FIST'];

export default function PreparePage() {
  const { themeId } = useParams();
  const theme = getTheme(themeId);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hand, setHand] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream>();
  const [recognition, setRecognition] = useState<RecognitionState>({ tracking: 'LOST', pose: 'UNKNOWN', stableForMs: 0 });
  const [poseIndex, setPoseIndex] = useState(0);
  const [skipDemo, setSkipDemo] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const preloadVideo = useRef<HTMLVideoElement | null>(null);
  const alive = useRef(true);
  const transferring = useRef(false);
  const runtime = getRuntime();
  const calibrationConfirmed = Boolean(runtime.preparationPolicy && recognition.tracking === 'GOOD' && recognition.stableForMs >= runtime.preparationPolicy.calibrationStableMs);
  const poseConfirmed = Boolean(runtime.preparationPolicy && recognition.tracking === 'GOOD' && recognition.pose === poses[poseIndex] && recognition.stableForMs >= runtime.preparationPolicy.poseStableMs);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; preloadVideo.current?.pause(); if (preloadVideo.current) { preloadVideo.current.removeAttribute('src'); preloadVideo.current.load(); } if (!transferring.current) endCameraSession(); };
  }, []);
  useEffect(() => { if (video.current && stream) { video.current.srcObject = stream; void video.current.play().catch(() => {}); } }, [stream, step]);
  useEffect(() => runtime.recognition?.subscribe(setRecognition), [runtime]);
  // Recognition pass durations are integration policy, never inferred from visual animation.
  useEffect(() => {
    if (!runtime.preparationPolicy) return;
    if (step === 2 && calibrationConfirmed) {
      const timer = setTimeout(() => { setStep(3); runtime.recognition?.startTutorialPose(poses[0]); }, 560);
      return () => clearTimeout(timer);
    }
    if (step === 3 && poseConfirmed) {
      const timer = setTimeout(() => {
        runtime.recognition?.finishTutorialPose();
        if (poseIndex < 2) { setPoseIndex(poseIndex + 1); runtime.recognition?.startTutorialPose(poses[poseIndex + 1]); }
        else setStep(4);
      }, 560);
      return () => clearTimeout(timer);
    }
  }, [runtime, calibrationConfirmed, poseConfirmed, step, poseIndex]);
  useEffect(() => {
    if (step !== 4 || !theme) return;
    const controller = new AbortController();
    setError('');
    loadManifest(theme.id, controller.signal).then(() => {
      if (!alive.current) return;
      const assets = getThemeAssets(theme.id);
      const image = new Image();
      image.onload = () => { if (alive.current) setMediaReady(true); };
      image.onerror = () => { if (alive.current) setError('主题背景没有加载完成，请返回后再试。'); };
      image.src = assetUrl(assets.backgroundImage);
      if (assets.backgroundVideo) {
        const media = document.createElement('video');
        preloadVideo.current = media;
        media.preload = 'metadata'; media.playsInline = true; media.muted = true;
        media.src = assetUrl(assets.backgroundVideo); media.load();
      }
    }).catch((err: Error) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [step, theme]);
  async function requestCamera() {
    setBusy(true); setError('');
    try {
      endCameraSession();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('请使用 HTTPS 链接，在 Safari 或系统浏览器中打开。');
      const media = runtime.recognition ? await runtime.recognition.requestCamera(hand) : await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!alive.current) { media.getTracks().forEach(track => track.stop()); return; }
      preparationSession.stream = media; preparationSession.hand = hand; preparationSession.themeId = theme?.id;
      setStream(media); setStep(2);
      if (!runtime.recognition || !runtime.preparationPolicy) setError('摄像头已开启，动作识别暂时不可用。请稍后重试。');
    } catch (err) {
      if (!alive.current) return;
      const name = (err as DOMException).name;
      setError(name === 'NotAllowedError' ? '需要摄像头才能识别动作。请在浏览器的网站设置中允许摄像头，然后重试。' : name === 'NotFoundError' ? '没有找到摄像头。请使用带摄像头的手机或电脑。' : name === 'NotReadableError' ? '摄像头正被其他应用使用，请关闭后重试。' : (err as Error).message);
    } finally { if (alive.current) setBusy(false); }
  }
  if (!theme) return <AppShell><div className="narrow-page"><h1>这个主题还没有准备好</h1><Link className="primary-button" to="/">返回首页</Link></div></AppShell>;
  const currentPose = poses[poseIndex];
  return <AppShell compact><div className="prepare-page" style={themeStyle(theme)}><div className="prepare-top" data-exit><Link to="/" className="back-link"><ArrowLeft size={18} /> 返回主题</Link><span className="selected-theme"><img src={posterUrl(theme.id)} alt="" />{theme.name}<span>· 约 90 秒</span></span></div>
    <div className="stepper" aria-label={`准备进度，第 ${step + 1} 步，共 5 步`} data-exit>{steps.map((s, i) => <div key={s} className={`step ${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Check size={14} /> : `0${i + 1}`}</span><p>{s}</p>{i < 4 && <i />}</div>)}</div>
    <section className="preparation-card" data-exit>
      {step === 0 && <><div className="preparation-symbol"><Camera size={38} strokeWidth={1.3} /><span><Check size={13} /></span></div><p className="eyebrow">轻松开始，安心体验</p><h1 tabIndex={-1}>让摄像头，读懂你的小动作</h1><p className="preparation-intro">接下来会使用摄像头识别手部动作。<br />你只需要动动手，记录的事交给我们。</p><div className="privacy-list"><div><Camera /><span><strong>画面只用于实时识别</strong><small>不录制、不保存，也不上传摄像头画面。</small></span></div><div><LockKeyhole /><span><strong>训练记录默认留在本机</strong><small>无需注册，即可开始自己的节奏时光。</small></span></div><div><ShieldCheck /><span><strong>由你决定是否分享</strong><small>确认绑定后，治疗师才能看到训练汇总。</small></span></div></div><button className="primary-button wide" onClick={() => setStep(1)}>了解了，继续 <ArrowRight size={18} /></button><p className="micro-note">开启前，浏览器会再次征求你的许可</p></>}
      {step === 1 && <><p className="eyebrow">跟着自己的节奏来</p><h1 tabIndex={-1}>今天，想动动哪只手？</h1><p className="preparation-intro">选择这次训练使用的手，全程单手入镜。</p><div className="hand-selector" role="group" aria-label="选择训练手">{(['LEFT', 'RIGHT'] as const).map(h => <button key={h} className={hand === h ? 'selected' : ''} aria-pressed={hand === h} onClick={() => setHand(h)}><Hand className={h === 'LEFT' ? 'mirror' : ''} size={64} strokeWidth={1.1} /><span>{h === 'LEFT' ? '左手' : '右手'}</span><span className="radio-dot">{hand === h && <Check size={13} />}</span></button>)}</div><div className="setup-tips"><span><Smartphone />固定手机</span><span><Sun />光线充足</span><span><Volume2 />打开声音</span></div>{error && <Notice>{error}</Notice>}<button disabled={busy} className="primary-button wide" onClick={requestCamera}><Camera size={18} />{busy ? '正在开启摄像头…' : '继续并开启摄像头'}<ArrowRight size={18} /></button><button className="text-button" onClick={() => setStep(0)}>上一步</button></>}
      {step === 2 && <><p className="eyebrow">找到一个舒服的位置</p><h1 tabIndex={-1}>{recognition.tracking === 'GOOD' ? '看到你了，保持一下' : '把手放进这里'}</h1><p className="preparation-intro">手掌面向镜头，让整只手完整出现在画面中。</p><div className={`camera-frame ${recognition.tracking === 'GOOD' ? 'is-tracked' : ''}`}><video ref={video} muted playsInline autoPlay aria-label="镜像摄像头预览" /><div className="camera-guide"><PoseIcon /><span>{recognition.tracking === 'GOOD' ? <><Check size={18} /> 已准备</> : '手放在这里'}</span></div><span className="camera-label"><span /> 实时镜像 · 仅本机识别</span></div><div className="recognition-hint"><span className="tiny-beat" />{recognition.tracking === 'ADJUST' ? '调整一下距离，稍微往中间一点' : recognition.tracking === 'GOOD' ? '已准备，马上开始动作教学' : '把一只手完整放进画面'}</div>{error && <Notice retry={requestCamera}>{error}</Notice>}<p className="micro-note">识别稳定后会自动继续</p></>}
      {step === 3 && <><div className="tutorial-top"><span>动作 {poseIndex + 1} / 3</span><button className="text-button" onClick={() => setSkipDemo(true)}>跳过示范 <ChevronRight size={15} /></button></div><h1 tabIndex={-1}>{poseInfo[currentPose].name}</h1><p className="preparation-intro">{poseInfo[currentPose].hint}</p><div className="tutorial-rule-strip"><div>{poses.map(p => <span key={p} className={p === currentPose ? 'active' : ''}><PoseIcon pose={p} />{poseInfo[p].name}</span>)}</div><small>训练时按此顺序循环；每动作 3 秒，正确姿势累计满 2 秒即保持完成。</small></div><div className="tutorial-demonstration"><GestureTeachingMedia pose={currentPose} videoUrl={runtime.tutorialVideos?.[currentPose]} disabled={skipDemo} /></div><div className="tutorial-attempt"><video ref={video} muted playsInline autoPlay aria-label="尝试动作的镜像预览" /><span>{recognition.pose === currentPose ? '看到了，轻轻保持一下' : recognition.pose === 'UNKNOWN' && recognition.tracking !== 'LOST' ? '请稍微调整手型' : `试着做一次${poseInfo[currentPose].name}`}</span></div><div className="tutorial-dots">{poses.map((p, i) => <span key={p} className={i <= poseIndex ? 'active' : ''} />)}</div><p className="micro-note">跳过示范后，仍需完成三个动作的真实识别确认</p></>}
      {step === 4 && <><div className="ready-symbol"><Check size={44} strokeWidth={1.3} /></div><p className="eyebrow">属于你的 90 秒，即将开始</p><h1 tabIndex={-1}>一切就绪，跟着节奏来</h1><p className="preparation-intro">{theme.description}<br />不必着急，每一个小动作都有回应。</p><div className="ready-theme"><img src={posterUrl(theme.id)} alt="" /><div><h3>{theme.name}</h3><span>{hand === 'LEFT' ? '左手' : '右手'}训练 · 约 90 秒</span></div><Check size={20} /></div>{error && <Notice>{error}</Notice>}<button disabled={!mediaReady || !runtime.createEngine} className="primary-button wide" onClick={() => { preparationSession.ready = true; transferring.current = true; navigate(`/train/${theme.id}`); }}>{mediaReady ? '开始训练' : '正在准备训练内容…'}<ArrowRight size={18} /></button><p className="micro-note">训练中可随时暂停，按自己的节奏来</p></>}
    </section><p className="prepare-footnote"><ShieldCheck size={14} /> 你的摄像头画面只在本机处理</p></div></AppShell>;
}
