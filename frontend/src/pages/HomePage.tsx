import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLaunchTheme } from '../components/RippleLoading';
import { ThemeSelector } from '../features/themes/ThemeSelector';
import '../theme/entry.css';

export default function HomePage() {
  const launch = useLaunchTheme();
  return <main id="main-content" className="theme-screen">
    <Link to="/" className="back-link theme-back" data-exit><ArrowLeft size={18} />返回</Link>
    <h1 tabIndex={-1} data-exit>选一个喜欢的世界，开始今天的练习。</h1>
    <ThemeSelector onLaunch={launch} />
  </main>;
}
