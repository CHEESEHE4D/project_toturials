document.documentElement.classList.add('js');
const root = document.documentElement;
let size = 16;
try { size = Math.min(21, Math.max(14, Number(localStorage.getItem('rhythm-doc-font')) || 16)); } catch {}
root.style.setProperty('--article-size', `${size}px`);
document.querySelectorAll('[data-font]').forEach(button => button.addEventListener('click', () => {
  size = Math.min(21, Math.max(14, size + (button.dataset.font === 'up' ? 1 : -1)));
  root.style.setProperty('--article-size', `${size}px`);
  try { localStorage.setItem('rhythm-doc-font', String(size)); } catch {}
}));
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
const menu = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
menu?.addEventListener('click', () => {
  const open = sidebar.classList.toggle('is-open');
  menu.setAttribute('aria-expanded', String(open));
} );
document.querySelectorAll('.toc-link').forEach(link => link.addEventListener('click', () => {
  if (window.innerWidth <= 760) { sidebar.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); }
}));
const headings = [...document.querySelectorAll('.prose h2, .prose h3')];
const links = [...document.querySelectorAll('.toc-link')];
const bar = document.querySelector('.reading-progress');
let scheduled = false;
function update() {
  scheduled = false;
  const max = document.documentElement.scrollHeight - innerHeight;
  if (bar) bar.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
  let current = headings[0]?.id;
  for (const h of headings) { if (h.getBoundingClientRect().top <= 140) current = h.id; else break; }
  for (const link of links) {
    const active = link.hash === `#${current}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  }
}
addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
addEventListener('resize', update);
update();

