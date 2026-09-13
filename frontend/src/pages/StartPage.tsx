import { Link } from 'react-router-dom';
import { RhythmMark } from '../components/Brand';
import '../theme/entry.css';

export default function StartPage() {
  return <main id="main-content" className="entry-start">
    <div className="entry-start-content">
      <RhythmMark className="entry-mark" />
      <h1 tabIndex={-1}>节奏康复</h1>
      <nav className="entry-actions" aria-label="开始菜单">
        <Link className="primary-button" to="/themes">开始</Link>
        <Link className="secondary-button" to="/history">过往记录</Link>
      </nav>
    </div>
  </main>;
}
