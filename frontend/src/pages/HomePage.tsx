import { ArrowRight, ArrowUpRight, Camera, Clock3, Hand, Headphones, Leaf, Link2, Orbit, PawPrint, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/Layout';
import { useLaunchTheme } from '../components/RippleLoading';
import { themes, themeStyle, posterUrl } from '../theme/themeConfig';
import { PoseIcon } from '../components/PoseIcon';

export default function HomePage() {
  const launch = useLaunchTheme();
  return <AppShell><div className="home-content">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy" data-exit><div className="eyebrow"><span className="tiny-beat" />给自己，一首歌的时间</div><h1 id="home-title" tabIndex={-1}>跟着音乐<span className="hero-comma">，</span><br className="mobile-break" />动动手<span className="hero-period">。</span></h1><p>摄像头会自动识别你的动作与节奏<br className="mobile-break" /><span className="desktop-only">，</span>让每一次舒展，都有轻柔的回应。</p><div className="hero-facts"><span><Clock3 /> 约 90 秒</span><i /><span><Hand /> 三个简单动作</span><i /><span><Headphones /> 一段放松时光</span></div></div>
      <div className="hero-art" data-exit aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" /><span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-dot dot-three" /><div className="art-hand"><PoseIcon /><span className="art-spark"><Sparkles size={21} /></span></div><span className="art-caption">轻轻一动，慢慢靠近。</span></div>
    </section>
    <section className="theme-section" aria-labelledby="theme-heading"><div className="section-heading" data-exit><div><span className="section-index">01 /</span><h2 id="theme-heading">今天，想去哪里？</h2></div><p>选一个喜欢的世界，开始这段节奏时光</p></div>
      <div className="theme-grid">{themes.map((theme, i) => { const Icon = [PawPrint, Leaf, Orbit][i]; return <article key={theme.id} className="theme-card" style={themeStyle(theme)} data-exit>
        <div className="theme-poster"><img src={posterUrl(theme.id)} alt={['暖阳草地里，小柴犬和它的橙色小球', '晨光中的花园，白色花朵从陶盆里舒展', '暮蓝星空下，小小旅人遥望有光环的星球'][i]} loading="eager" width="1200" height="800" /><span className="mood-tag"><Icon size={14} />{theme.mood}</span><span className="poster-number">0{i + 1}</span></div>
        <div className="theme-card-body"><span className="theme-english">{theme.english}</span><div className="theme-title-row"><h3>{theme.name}</h3><span><Clock3 size={14} /> 约 90 秒</span></div><p>{theme.description}</p><button className="primary-button theme-start" onClick={() => launch(theme.id)} aria-label={`开始体验${theme.name}`}>开始体验 <ArrowUpRight size={19} /></button></div>
      </article>; })}</div>
    </section>
    <div className="home-bottom" data-exit><div className="gentle-note"><span className="note-icon"><Camera size={21} /></span><div><h3>只需要一部手机，和轻松的你</h3><p>固定手机，把手放进画面。接下来，让音乐带着你。</p></div></div><Link className="binding-nudge" to="/binding"><Link2 size={18} /><span>让治疗师看见你的每一小步</span><ArrowRight size={18} /></Link></div>
    <p className="home-privacy" data-exit><ShieldCheck size={14} /> 视频画面不保存<span>·</span>记录默认留在本机<span>·</span>游戏成绩不表示康复疗效</p>
  </div></AppShell>;
}
