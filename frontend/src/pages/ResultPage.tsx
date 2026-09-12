import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SessionSummary } from '../contracts';
import { AppShell, Notice } from '../components/Layout';
import { ResultSummary } from '../features/history/ResultSummary';
import { getRuntime } from '../services/runtime';

export default function ResultPage() {
  const { sessionId } = useParams();
  const [summary, setSummary] = useState<SessionSummary | null>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; const repository = getRuntime().repository; const read = () => { setError(''); repository.get(sessionId ?? '').then(record => { if (active) setSummary(record); }).catch((err: Error) => { if (active) setError(err.message); }); }; read(); const unwatch = repository.watch(read); return () => { active = false; unwatch(); }; }, [sessionId, retry]);
  return <AppShell compact>{error ? <div className="narrow-page"><Notice retry={() => setRetry(n => n + 1)}>{error}</Notice></div> : summary ? <ResultSummary summary={summary} /> : <div className="narrow-page"><h1>{summary === undefined ? '正在读取这段节奏…' : '还没有找到这次记录'}</h1><p>{summary === null && '记录保存在完成训练时使用的浏览器中。'}</p><Link to="/history" className="secondary-button">返回我的记录</Link></div>}</AppShell>;
}
