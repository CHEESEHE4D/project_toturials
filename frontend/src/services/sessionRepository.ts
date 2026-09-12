import type { SessionRepository, SessionSummary } from '../contracts';

const listeners = new Set<() => void>();
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('soft-rhythm-sessions', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions', { keyPath: 'id' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
    request.onerror = () => { database = undefined; reject(new Error('无法读取本机记录，请检查浏览器储存权限。')); };
    request.onblocked = () => { database = undefined; reject(new Error('请关闭其他训练页面后重试。')); };
  });
  return database;
}
function isSession(value: unknown): value is SessionSummary {
  if (!value || typeof value !== 'object') return false;
  const s = value as SessionSummary;
  return typeof s.id === 'string' && typeof s.themeId === 'string' && ['COMPLETED', 'ABORTED'].includes(s.status) &&
    Number.isFinite(s.completedTasks) && Number.isFinite(s.plannedTasks) && Number.isFinite(s.activeDurationMs) &&
    Number.isFinite(s.perfect) && Number.isFinite(s.good) && Number.isFinite(s.miss) &&
    s.plannedTasks === 15 && s.completedTasks >= 0 && s.completedTasks <= 15 && s.judgedTasks >= 0 && s.judgedTasks <= 15 &&
    s.perfect >= 0 && s.good >= 0 && s.miss >= 0 && s.perfect + s.good + s.miss === s.judgedTasks &&
    s.plannedDurationMs === 90000 && s.activeDurationMs >= 0 && s.activeDurationMs <= s.plannedDurationMs &&
    ['LOCAL_ONLY', 'PENDING', 'SYNCED', 'FAILED'].includes(s.syncState) &&
    !Number.isNaN(Date.parse(s.startedAt)) && !Number.isNaN(Date.parse(s.endedAt));
}
export const sessionRepository: SessionRepository = {
  async save(summary) {
    if (!isSession(summary)) throw new Error('训练记录格式不完整，暂时无法保存。');
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(summary);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('本机储存空间不足，训练记录尚未保存。'));
      tx.onabort = () => reject(new Error('保存中断，请重试。'));
    });
    listeners.forEach(listener => listener());
  },
  async get(id) {
    const records = await this.list();
    return records.find(record => record.id === id) ?? null;
  },
  async list() {
    const db = await openDatabase();
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const request = tx.objectStore('sessions').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('记录没有读取完成，请重试。'));
    });
    if (!records.every(isSession)) throw new Error('有一条本机记录无法读取。原始记录已保留，请联系项目维护者修复。');
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },
  watch(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};
