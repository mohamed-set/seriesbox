// SeriesBox: router, navigation, global interactions.
import { TITLES } from './data/titles.js';
import * as store from './store.js';
import * as posters from './posters.js';
import { $, $$, esc, icon, toast, heartBurst, poster, avatar, meUser, kindLabel } from './ui.js';
import { BY_ID } from './ai.js';
import { onboarding } from './views/onboarding.js';
import { home } from './views/home.js';
import { titlePage } from './views/title.js';
import { myLists } from './views/lists.js';
import { rankings } from './views/rankings.js';
import { charts } from './views/charts.js';
import { community, userPage } from './views/community.js';
import { profilePage } from './views/profile.js';
import { mood } from './views/mood.js';
import { lab } from './views/lab.js';

const ROUTES = [
  [/^\/?$/, home],
  [/^\/title\/([\w-]+)$/, titlePage],
  [/^\/lists(?:\/(\w+))?$/, myLists],
  [/^\/rankings$/, rankings],
  [/^\/charts$/, charts],
  [/^\/community$/, community],
  [/^\/user\/([\w.-]+)$/, userPage],
  [/^\/profile$/, profilePage],
  [/^\/mood$/, mood],
  [/^\/lab$/, lab],
];

const NAV = [
  ['#/', 'Home'], ['#/charts', 'Charts'], ['#/rankings', 'My Rankings'], ['#/lists', 'Hearts'],
  ['#/community', 'Community'], ['#/mood', 'Mood Match'], ['#/lab', 'AI Lab'],
];

const app = () => $('#app');
let current = null;

function renderNav() {
  const p = store.me().profile;
  const path = location.hash || '#/';
  $('#nav').classList.toggle('onboarding-nav', !p);
  $('#nav').innerHTML = `
    <a class="logo" href="#/"><span>SERIES</span>BOX</a>
    <nav class="links">${NAV.map(([h, l]) => `<a href="${h}" class="${(h === '#/' ? path === '#/' || path === '' : path.startsWith(h)) ? 'active' : ''}">${l}</a>`).join('')}</nav>
    <div class="nav-right">
      <button class="ib ghost" id="open-search" aria-label="Search (press /)">${icon.search}</button>
      ${p ? `<a href="#/profile" class="nav-me" title="Your profile & stats">${avatar(meUser(), 34)}</a>` : ''}
    </div>`;
  $('#tabbar').innerHTML = [['#/', '🏠', 'Home'], ['#/charts', '🏆', 'Charts'], ['#/mood', '🎲', 'Mood'], ['#/lists', '❤', 'Hearts'], ['#/profile', '👤', 'Me']]
    .map(([h, e, l]) => `<a href="${h}" class="${path === h || (h !== '#/' && path.startsWith(h)) ? 'active' : ''}"><span>${e}</span>${l}</a>`).join('');
}

export function route() {
  const m = store.me();
  const path = (location.hash || '#/').slice(1);
  renderNav();
  if (!m.profile) { mount(onboarding, []); return; }
  for (const [re, view] of ROUTES) {
    const match = path.match(re);
    if (match) { mount(view, match.slice(1)); return; }
  }
  location.hash = '#/';
}

function mount(view, params) {
  if (current && current.unmount) current.unmount();
  const out = view(...params);
  current = out;
  app().innerHTML = `<div class="page fade-in">${out.html}</div>`;
  window.scrollTo(0, out.keepScroll ? window.scrollY : 0);
  if (out.mount) out.mount(app());
  posters.paint(app());
}

/** Re-render the current page in place (after a like/rating), keeping scroll. */
export function refresh() {
  const y = window.scrollY;
  const scrolls = $$('.track').map((t) => t.scrollLeft);
  route();
  window.scrollTo(0, y);
  $$('.track').forEach((t, i) => (t.scrollLeft = scrolls[i] || 0));
}

// ---- Global interactions (event delegation) ----
document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act) {
    e.preventDefault(); e.stopPropagation();
    const id = act.dataset.id;
    if (act.dataset.act === 'like') {
      const on = store.toggleLike(id);
      if (on) { const r = act.getBoundingClientRect(); heartBurst(r.left + r.width / 2, r.top + r.height / 2); toast(`❤ Added <b>${esc(BY_ID[id].title)}</b> to your Hearts`); }
      refresh();
    } else if (act.dataset.act === 'watchlist') {
      const on = store.toggleWatchlist(id);
      toast(on ? `＋ <b>${esc(BY_ID[id].title)}</b> added to your Watchlist` : 'Removed from Watchlist');
      refresh();
    }
    return;
  }
  const sc = e.target.closest('[data-scroll]');
  if (sc) {
    const track = sc.parentElement.querySelector('.track');
    track.scrollBy({ left: Number(sc.dataset.scroll) * track.clientWidth * 0.85, behavior: 'smooth' });
    return;
  }
  const star = e.target.closest('.star-input i');
  if (star) {
    const box = star.closest('.star-input');
    const v = Number(star.dataset.v);
    const id = box.dataset.id;
    const prev = store.me().ratings[id];
    store.rate(id, prev === v ? 0 : v);
    toast(prev === v ? 'Rating removed' : `★ You rated <b>${esc(BY_ID[id].title)}</b> ${v}/5`);
    refresh();
    return;
  }
  if (e.target.closest('#open-search')) openSearch();
});

// Hover preview on half-stars.
document.addEventListener('mouseover', (e) => {
  const star = e.target.closest('.star-input i');
  const box = e.target.closest('.star-input');
  if (!box) return;
  const v = star ? Number(star.dataset.v) : Number(box.dataset.value);
  $$('.si', box).forEach((s, i) => { s.classList.toggle('full', v >= i + 1); s.classList.toggle('half', v < i + 1 && v >= i + 0.5); });
  $('.si-label', box).textContent = v ? v.toFixed(1) : 'Rate';
});
document.addEventListener('mouseout', (e) => {
  const box = e.target.closest('.star-input');
  if (!box || box.contains(e.relatedTarget)) return;
  const v = Number(box.dataset.value);
  $$('.si', box).forEach((s, i) => { s.classList.toggle('full', v >= i + 1); s.classList.toggle('half', v < i + 1 && v >= i + 0.5); });
  $('.si-label', box).textContent = v ? v.toFixed(1) : 'Rate';
});

// ---- Search overlay ----
function openSearch() {
  const ov = $('#search');
  ov.classList.add('open');
  const input = $('#search-input');
  input.value = '';
  input.focus();
  renderSearch('');
}
function closeSearch() { $('#search').classList.remove('open'); }
function renderSearch(q) {
  q = q.trim().toLowerCase();
  const res = TITLES.filter((t) => !q || t.title.toLowerCase().includes(q) || t.tags.some((g) => g.includes(q)) || t.genres.some((g) => g.toLowerCase().includes(q)) || t.creator.toLowerCase().includes(q))
    .sort((a, b) => (b.title.toLowerCase().startsWith(q) - a.title.toLowerCase().startsWith(q)) || b.popularity - a.popularity).slice(0, 24);
  $('#search-results').innerHTML = res.length ? res.map((t) => `<a href="#/title/${t.id}" class="sr">${poster(t, 'xs')}<div><b>${esc(t.title)}</b><small>${t.year} · ${kindLabel(t)} · ${t.genres.join(', ')}</small></div></a>`).join('')
    : `<p class="muted">No match for “${esc(q)}”. Try a genre or a vibe like “time travel”.</p>`;
  posters.paint($('#search-results'));
}
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});
$('#search-input').addEventListener('input', (e) => renderSearch(e.target.value));
$('#search').addEventListener('click', (e) => { if (e.target.id === 'search' || e.target.closest('.sr') || e.target.closest('.close')) closeSearch(); });

window.addEventListener('scroll', () => $('#nav').classList.toggle('solid', window.scrollY > 30), { passive: true });
window.addEventListener('hashchange', route);
route();
posters.loadAll();
