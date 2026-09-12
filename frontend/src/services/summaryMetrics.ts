import type { SessionSummary } from '../contracts';
// Display aggregation of already confirmed engine counts; never reclassifies a pose or beat.
export function summaryMetrics(summary: SessionSummary) {
  return { completion: summary.plannedTasks ? Math.round(summary.completedTasks / summary.plannedTasks * 100) : 0,
    rhythm: summary.judgedTasks ? Math.round(100 * (summary.perfect + .6 * summary.good) / summary.judgedTasks) : null };
}
export function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export const syncLabels = { LOCAL_ONLY: '仅保存在本机', PENDING: '已存本机 · 等待同步', SYNCED: '已同步给治疗师', FAILED: '已存本机 · 同步待重试' };
