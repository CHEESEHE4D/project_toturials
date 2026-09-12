import { Link } from 'react-router-dom';

export function RhythmMark({ className = '' }: { className?: string }) {
  return <svg className={`rhythm-mark ${className}`} viewBox="0 0 40 40" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M6 21v-3m7 9V12m7 19V9m7 18V13m7 9v-5" /></g></svg>;
}
export function Brand() {
  return <Link to="/" className="brand" aria-label="节奏康复首页"><RhythmMark /><span>节奏康复<span className="brand-en">SOFT RHYTHM</span></span></Link>;
}
