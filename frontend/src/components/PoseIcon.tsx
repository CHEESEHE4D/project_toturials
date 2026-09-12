import type { Pose } from '../contracts';

// UI reminders only. These symbols are not an anatomical demonstration or calibration standard.
export function PoseIcon({ pose = 'STRAIGHT', className = '' }: { pose?: Pose; className?: string }) {
  return <svg viewBox="0 0 100 112" className={`pose-icon ${className}`} fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {pose === 'STRAIGHT' || pose === 'UNKNOWN' ? <>
      <path d="M29 99V76L14 53c-5-9 4-14 10-7l8 11V27c0-10 12-10 12 0v24-35c0-10 12-10 12 0v35-30c0-10 12-10 12 0v33-21c0-9 12-9 12 0v35c0 15-10 20-10 31" />
      <path d="M42 72c5-9 14-12 24-8M29 99h41" />
    </> : pose === 'HOOK' ? <>
      <path d="M27 99V77L16 61c-5-8 3-14 9-7l8 10V37c0-8 11-8 11 0v15" />
      <path d="M44 52V29c0-8 12-8 12 0v22c0 7-4 11-10 11h-3" />
      <path d="M56 53V34c0-8 12-8 12 0v20c0 7-4 11-10 11h-3" />
      <path d="M68 57V43c0-8 12-8 12 0v21c0 18-11 23-11 35M43 73c7-6 15-8 24-4M27 99h42" />
    </> : <>
      <path d="M28 99V78c-9-8-13-17-8-22 4-5 10-1 15 6V51c0-8 11-8 11 0v8" />
      <path d="M35 61h35c8 0 10 10 4 14l-10 7c-4 3-6 8-6 17" />
      <path d="M46 60V45c0-8 11-8 11 0v15M57 60V47c0-8 11-8 11 0v14M68 61v-8c0-8 11-8 11 0v13" />
      <path d="M36 69c8-6 17-5 25 0 7 5 3 13-4 10l-10-4M28 99h30" />
    </>}
  </svg>;
}
