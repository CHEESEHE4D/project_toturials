import type { Pose } from '../contracts';

// UI reminders only. These symbols are not an anatomical demonstration or calibration standard.
export function PoseIcon({ pose = 'STRAIGHT', className = '' }: { pose?: Pose; className?: string }) {
  return <svg viewBox="0 0 100 112" className={`pose-icon ${className}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {pose === 'STRAIGHT' || pose === 'UNKNOWN' ? <><path d="M29 98V76L14 53c-5-9 4-14 10-7l8 11V27c0-10 12-10 12 0v24-35c0-10 12-10 12 0v35-30c0-10 12-10 12 0v33-21c0-9 12-9 12 0v35c0 15-10 20-10 30"/><path d="M42 72c5-9 14-12 24-8M29 99h41"/></> : pose === 'HOOK' ? <><path d="M29 98V75L15 55c-4-8 3-14 9-7l8 9V29c0-8 12-8 12 0v15h-5m5-15v-6c0-8 12-8 12 0v21h-5m5-16c0-8 12-8 12 0v19h-5m5-11c0-8 12-8 12 0v28c0 18-10 23-10 34"/><path d="M43 69c8-7 15-8 23-5M29 99h41"/></> : <><path d="M29 98V79C18 68 15 56 22 52c5-3 9 2 12 6V45c0-9 12-9 12 0v9-15c0-9 12-9 12 0v15-12c0-9 12-9 12 0v15-8c0-9 12-9 12 0v18c0 13-12 22-12 31"/><path d="M31 63c10-11 19-10 28-5 8 5 4 14-4 11l-9-2M29 99h41"/></>}
  </svg>;
}
