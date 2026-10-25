// Community charts: rankings of series and anime by several metrics.
import { TITLES } from '../data/titles.js';
import * as store from '../store.js';
import { chartStats, BY_ID } from '../ai.js';
import { esc, poster, stars, fmt1, icon, kindLabel } from '../ui.js';

const METRICS = {
  top: { label: 'Top rated', desc: 'Bayesian weighted score (IMDb formula): shows with few ratings are pulled toward the global mean.', val: (s) => s.weighted, show: (s) => fmt1(s.avg) + '★' },
  trending: { label: 'Trending', desc: 'Review activity in the last weeks, weighted by recency and review likes.', val: (s) => s.buzz, show: (s) => `🔥 ${Math.round(s.buzz * 10)}` },
  loved: { label: 'Most loved', desc: 'Number of users who put the show in their Hearts.', val: (s) => s.likes + s.avg / 10, show: (s) => `❤ ${s.likes}` },
  popular: { label: 'Most watched', desc: 'Number of ratings.', val: (s) => s.n, show: (s) => `${s.n} ratings` },
  divisive: { label: 'Most divisive', desc: 'Highest rating standard deviation: people either love it or hate it.', val: (s) => (s.n >= 4 ? s.std : 0), show: (s) => `σ ${fmt1(s.std)}` },
};
const f = { kind: 'all', metric: 'top', genre: 'All', decade: 'All' };

export function charts() {
  const m = store.me();
  const stats = chartStats(m);
  const genres = ['All', ...new Set(TITLES.flatMap((t) => t.genres))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));
  const decades = ['All', ...[...new Set(TITLES.map((t) => Math.floor(t.year / 10) * 10))].sort().map((d) => d + 's')];
  const M = METRICS[f.metric];
  const list = TITLES.filter((t) => (f.kind === 'all' || t.kind === f.kind) && (f.genre === 'All' || t.genres.includes(f.genre)) && (f.decade === 'All' || `${Math.floor(t.year / 10) * 10}s` === f.decade) && stats[t.id].n > 0)
    .sort((a, b) => M.val(stats[b.id]) - M.val(stats[a.id])).slice(0, 50);
  // Weekly movement: compare with the ranking on the same metric without this week's buzz (deterministic pseudo-history).
  const move = (id, i) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997; const d = (h % 7) - 3; return i < 3 && d < 0 ? 0 : d; };

  const podium = list.slice(0, 3);
  const html = `
  <div class="page-head"><h1>Charts</h1><p class="muted">Community rankings, updated live with every rating (yours included).</p></div>
  <div class="filters">
    <div class="seg">${[['all', 'All'], ['series', 'Series'], ['anime', 'Anime']].map(([k, l]) => `<button data-kind="${k}" class="${f.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="seg">${Object.entries(METRICS).map(([k, v]) => `<button data-metric="${k}" class="${f.metric === k ? 'on' : ''}">${v.label}</button>`).join('')}</div>
    <select class="select" id="genre">${genres.map((g) => `<option ${g === f.genre ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <select class="select" id="decade">${decades.map((g) => `<option ${g === f.decade ? 'selected' : ''}>${g}</option>`).join('')}</select>
  </div>
  <p class="metric-desc">${icon.info} ${M.desc}</p>
  ${podium.length === 3 ? `<div class="podium">${[1, 0, 2].map((i) => { const t = podium[i]; return `<a class="pod p${i + 1}" href="#/title/${t.id}">${poster(t)}<div class="pod-rank">${i + 1}</div><b>${esc(t.title)}</b><small>${M.show(stats[t.id])}</small></a>`; }).join('')}</div>` : ''}
  <ol class="chart">${list.map((t, i) => {
    const s = stats[t.id], mv = move(t.id, i);
    return `<li><span class="ch-rank">${i + 1}</span><span class="ch-move ${mv > 0 ? 'up' : mv < 0 ? 'down' : ''}">${mv > 0 ? icon.up + mv : mv < 0 ? icon.down + -mv : '–'}</span>
      <a href="#/title/${t.id}">${poster(t, 'xs')}</a>
      <a class="ch-title" href="#/title/${t.id}"><b>${esc(t.title)}</b><small>${t.year} · ${kindLabel(t)} · ${t.genres.slice(0, 2).join(', ')}</small></a>
      <span class="ch-stars">${stars(s.avg, 'sm')} <b>${fmt1(s.avg)}</b></span>
      <span class="ch-val">${M.show(s)}</span>
      <span class="ch-me">${m.ratings[t.id] ? `You: <b>${m.ratings[t.id]}★</b>` : m.likes[t.id] ? '❤' : ''}</span>
      <button class="ib sm like ${m.likes[t.id] ? 'on' : ''}" data-act="like" data-id="${t.id}">${icon.heart(!!m.likes[t.id])}</button></li>`;
  }).join('')}</ol>`;

  return {
    html,
    mount(root) {
      const go = () => import('../app.js').then((a) => a.refresh());
      root.addEventListener('click', (e) => {
        const k = e.target.closest('[data-kind]'); if (k) { f.kind = k.dataset.kind; go(); }
        const mm = e.target.closest('[data-metric]'); if (mm) { f.metric = mm.dataset.metric; go(); }
      });
      root.querySelector('#genre').addEventListener('change', (e) => { f.genre = e.target.value; go(); });
      root.querySelector('#decade').addEventListener('change', (e) => { f.decade = e.target.value; go(); });
    },
  };
}
