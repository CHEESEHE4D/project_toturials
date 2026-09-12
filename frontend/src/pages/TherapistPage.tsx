import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import type { PatientListItem, SessionSummary } from '../contracts';
import { AppShell, Notice, PageHeading } from '../components/Layout';
import { getRuntime } from '../services/runtime';
import { getTheme } from '../theme/themeConfig';
import { summaryMetrics } from '../services/summaryMetrics';

export default function TherapistPage() {
  const { pathname } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const service = getRuntime().therapist;
  const isLogin = pathname.endsWith('/login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [patients, setPatients] = useState<PatientListItem[]>([]); const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [updated, setUpdated] = useState(''); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (isLogin) return;
    if (!service) { navigate('/therapist/login', { replace: true }); return; }
    let active = true; setBusy(true); setError('');
    const read = id ? service.listSessions(id).then(value => { if (active) setSessions(value); }) : service.listPatients().then(value => { if (active) setPatients(value); });
    read.then(() => { if (active) setUpdated(new Date().toLocaleTimeString('zh-CN')); }).catch((err: Error & { code?: string }) => { if (active) { if (err.code === 'UNAUTHORIZED') navigate('/therapist/login', { replace: true }); else setError('记录暂时无法读取，请检查连接或重新登录。'); } }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [isLogin, service, refresh, id, navigate]);
  async function login() {
    setError(''); if (!service) { setError('治疗师服务暂未开放，请稍后再来。'); return; }
    setBusy(true);
    try { await service.login(email, password); setPassword(''); navigate('/therapist/patients'); }
    catch { setError('登录尚未成功，请核对账号信息或稍后重试。'); }
    finally { setBusy(false); }
  }
  async function logout() { try { await service?.logout(); navigate('/therapist/login'); } catch { setError('暂时无法退出登录，请稍后重试。'); } }
  return <AppShell><div className={isLogin ? 'therapist-login' : 'standard-page'}><PageHeading title={isLogin ? '欢迎回来，治疗师' : id ? '用户训练记录' : '一起看见每一小步'} eyebrow="THERAPIST WORKSPACE" description={isLogin ? '登录后，查看与你绑定的用户训练汇总。' : '训练数据仅用于记录任务表现。'} back={id ? '/therapist/patients' : '/'} />{isLogin ? <form className="login-card" onSubmit={e => { e.preventDefault(); void login(); }}><span className="login-icon"><ShieldCheck size={28} /></span><label htmlFor="therapist-email">账号邮箱</label><input id="therapist-email" required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="输入你的账号邮箱" /><label htmlFor="therapist-password">密码</label><input id="therapist-password" required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" /><button disabled={busy} className="primary-button wide" type="submit">{busy ? '正在登录…' : '登录工作台'}<ArrowRight size={18} /></button><p className="micro-note">仅对已开通的治疗师账号开放</p></form> : <><div className="therapist-toolbar"><p>{updated ? `最后刷新 ${updated}` : '正在准备数据'}</p><div><button className="secondary-button" disabled={busy} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} /> 刷新</button><button className="text-button" onClick={logout}><LogOut size={16} /> 退出登录</button></div></div>{busy ? <p role="status">正在读取记录…</p> : <div className="table-scroll"><table><thead><tr>{(id ? ['日期', '主题', '状态', '有效时长', '动作完成', '节奏表现'] : ['用户昵称', '今日打卡', '最近训练', '训练记录']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{id ? sessions.map(s => <tr key={s.id}><td>{new Date(s.startedAt).toLocaleDateString('zh-CN')}</td><td>{getTheme(s.themeId)?.name ?? s.themeId}</td><td>{s.status === 'COMPLETED' ? '已完成' : '未完成'}</td><td>{Math.round(s.activeDurationMs / 1000)} 秒</td><td>{s.completedTasks}/{s.plannedTasks}</td><td>{summaryMetrics(s).rhythm ?? '暂无成绩'}</td></tr>) : patients.map(p => <tr key={p.id}><td>{p.displayName}</td><td>{p.checkedInToday ? '已打卡' : '暂无打卡'}</td><td>{p.lastTrainedAt ? new Date(p.lastTrainedAt).toLocaleString('zh-CN') : '无记录'}</td><td><Link to={`/therapist/patients/${p.id}`} className="text-button">查看记录 <ArrowRight size={15} /></Link></td></tr>)}</tbody></table>{!(id ? sessions.length : patients.length) && <div className="table-empty">{id ? '这位用户还没有训练记录' : '还没有与你绑定的用户'}</div>}</div>}</>}{error && <Notice>{error}</Notice>}</div></AppShell>;
}
