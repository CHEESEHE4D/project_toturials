import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Flower2, RotateCcw, ShieldCheck } from 'lucide-react';
import type { SessionSummary, ThemeId } from '../../contracts';
import { getTheme, posterUrl, themeStyle } from '../../theme/themeConfig';
import { localDateKey, summaryMetrics, syncLabels } from '../../services/summaryMetrics';
import { getRuntime } from '../../services/runtime';
import { useLaunchTheme } from '../../components/RippleLoading';

export function ResultSummary({ summary, preview = false }: { summary: SessionSummary; preview?: boolean }) {
  const theme = getTheme(summary.themeId)!;
  const launch = useLaunchTheme();
  const metrics = summaryMetrics(summary);
  const completed = summary.status === 'COMPLETED';
  const sameDay = localDateKey(new Date(summary.endedAt)) === localDateKey(new Date());
  const [syncError, setSyncError] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  async function retrySync() {
    const sync = getRuntime().sync;
    if (!sync) { setSyncError('同步服务暂不可用，记录已保存在本机。'); return; }
    setSyncBusy(true); setSyncError('');
    try { await sync.retryPending(); } catch { setSyncError('暂时没有同步成功，本机记录仍然保留。'); } finally { setSyncBusy(false); }
  }
  return <section className="result-summary" style={theme ? themeStyle(theme) : undefined}>
    <div className="completion-hero"><div className="completion-flower"><Flower2 size={48} strokeWidth={1.2} /><i /><i /><i /></div><p className="eyebrow">这一刻，属于认真动起来的你</p><h1 tabIndex={-1}>{completed ? (sameDay ? '完成今天的训练' : '训练完成') : '今天，先到这里'}</h1><p>{completed ? '每一个小小的动作，都留下了不一样的节奏。' : '本次未完成，不计入打卡。已经完成的动作也会被记录。'}</p>{completed && <span className="checkin-badge"><Check size={15} />{preview ? '打卡状态示例' : sameDay ? '今日已打卡' : '当日已打卡'}</span>}</div>
    <div className="result-card"><div className="result-theme"><img src={posterUrl(summary.themeId)} alt="" /><div><strong>{theme?.name ?? '节奏训练'}</strong><span>{new Date(summary.endedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div><span>{preview ? '示例记录' : '本次训练'}</span></div><div className="result-metrics"><div className="action-completion-metric"><span>动作完成</span><strong>{summary.completedTasks}<small> / {summary.plannedTasks}</small></strong><div className="completion-bar"><i style={{ width: `${metrics.completion}%` }} /></div><span className="completion-percent">完成率 {metrics.completion}%</span></div><div className="rhythm-metric"><span>节奏表现</span><strong>{metrics.rhythm ?? '—'}</strong><small>{metrics.rhythm === null ? '暂无成绩' : `已判定 ${summary.judgedTasks} 个节拍`}</small></div></div><div className="grade-breakdown">{[['Perfect', summary.perfect], ['Good', summary.good], ['Miss', summary.miss]].map(([label, count]) => <div key={label}><span><i className={`grade-dot-${String(label).toLowerCase()}`} />{label}</span><strong>{count}</strong></div>)}</div><div className="duration-row"><span><Clock3 size={16} />有效训练时间</span><strong>{Math.round(summary.activeDurationMs / 1000)} 秒</strong></div><div className="sync-status"><ShieldCheck size={15} /> {preview ? '设计示例 · 不保存、不打卡、不上传' : syncLabels[summary.syncState]}</div></div>
    {!preview && summary.syncState === 'FAILED' && <button className="text-button" disabled={syncBusy} onClick={retrySync}>{syncBusy ? '正在重试同步…' : '重新同步'}</button>}{syncError && <p className="notice" role="status">{syncError}</p>}<div className="result-actions"><button className="primary-button" onClick={() => launch(summary.themeId as ThemeId)}><RotateCcw size={17} />再练一次</button><Link className="secondary-button" to="/history">查看记录 <ArrowRight size={17} /></Link><Link className="text-button" to="/">返回首页</Link></div><p className="result-footnote">游戏成绩仅反映本次任务表现，不表示康复疗效。</p>
  </section>;
}
