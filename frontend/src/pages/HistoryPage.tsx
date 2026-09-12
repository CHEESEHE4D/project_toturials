import { useEffect, useState } from 'react';
import type { SessionSummary } from '../contracts';
import { AppShell, Notice, PageHeading } from '../components/Layout';
import { HistoryContent } from '../features/history/HistoryContent';
import { getRuntime } from '../services/runtime';

export default function HistoryPage() {
  const [records, setRecords] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const repository = getRuntime().repository;
    const read = () => { setLoading(true); setError(''); repository.list().then(rows => { if (active) setRecords(rows); }).catch((err: Error) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); };
    read(); const unwatch = repository.watch(read);
    return () => { active = false; unwatch(); };
  }, [retry]);
  return <AppShell><div className="standard-page"><PageHeading title="把每一小步，留在这里" eyebrow="MY LITTLE RHYTHMS" description="不比较，也不赶路。看看属于你的节奏足迹。" />{error ? <Notice retry={() => setRetry(n => n + 1)}>{error}</Notice> : loading ? <p role="status" className="reading-state">正在翻开你的记录…</p> : <HistoryContent records={records} />}</div></AppShell>;
}
