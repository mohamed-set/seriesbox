// My Rankings: drag & drop tier list (S to D) + personal ranked list.
import { TITLES } from '../data/titles.js';
import * as store from '../store.js';
import { BY_ID } from '../ai.js';
import { esc, poster, stars, toast, $, $$, icon } from '../ui.js';
import * as posters from '../posters.js';

const TIERS = [['S', '#ff2e63', 'Masterpiece'], ['A', '#ff9a3c', 'Loved it'], ['B', '#facc15', 'Good'], ['C', '#34d399', 'Okay'], ['D', '#60a5fa', 'Meh']];
let poolMode = 'mine';
let kindFilter = 'all';

export function rankings() {
  const m = store.me();
  const tiers = structuredClone(m.tiers);
  const placed = () => new Set(Object.values(tiers).flat());
  const tile = (id) => `<div class="tile" draggable="true" data-id="${id}" title="${esc(BY_ID[id].title)}">${poster(BY_ID[id], 'tile-poster')}</div>`;

  const poolIds = () => {
    const p = placed();
    const base = poolMode === 'mine'
      ? [...new Set([...Object.keys(m.likes), ...Object.keys(m.ratings)])]
      : TITLES.map((t) => t.id);
    return base.filter((id) => BY_ID[id] && !p.has(id) && (kindFilter === 'all' || BY_ID[id].kind === kindFilter));
  };

  const ranked = Object.keys(m.ratings).filter((id) => BY_ID[id] && (kindFilter === 'all' || BY_ID[id].kind === kindFilter))
    .sort((a, b) => m.ratings[b] - m.ratings[a] || (m.likes[b] ? 1 : 0) - (m.likes[a] ? 1 : 0));

  const board = () => `${TIERS.map(([k, c, l]) => `<div class="tier"><div class="tier-label" style="--c:${c}"><b>${k}</b><small>${l}</small></div><div class="tier-drop" data-tier="${k}">${tiers[k].filter((id) => BY_ID[id]).map(tile).join('')}</div></div>`).join('')}`;
  const pool = () => poolIds().map(tile).join('') || `<p class="muted">${poolMode === 'mine' ? 'All your shows are ranked! Switch to “All titles” to add more.' : 'Everything is ranked.'}</p>`;

  return {
    html: `
    <div class="page-head row-between"><div><h1>My Rankings</h1><p class="muted">Drag shows into tiers. Your tier list is saved automatically.</p></div>
      <div class="head-actions"><button class="btn glass" id="auto">${icon.spark} Auto-rank from my ratings</button><button class="btn glass" id="share">Share</button><button class="btn ghost" id="clear">Clear</button></div></div>
    <div class="seg" id="kind">${['all', 'series', 'anime'].map((k) => `<button data-k="${k}" class="${kindFilter === k ? 'on' : ''}">${k === 'all' ? 'All' : k === 'series' ? 'Series' : 'Anime'}</button>`).join('')}</div>
    <div class="tierlist" id="board">${board()}</div>
    <div class="pool-head"><h3>Unranked</h3><div class="seg sm" id="poolmode"><button data-p="mine" class="${poolMode === 'mine' ? 'on' : ''}">My shows</button><button data-p="all" class="${poolMode === 'all' ? 'on' : ''}">All titles</button></div><span class="muted">Tip: click a tile, then click a tier.</span></div>
    <div class="tier-drop pool" data-tier="pool" id="pool">${pool()}</div>

    <div class="page-head"><h2>Ranked by my ratings</h2></div>
    ${ranked.length ? `<ol class="ranked">${ranked.map((id, i) => `<li><span class="rk">${i + 1}</span><a href="#/title/${id}">${poster(BY_ID[id], 'xs')}</a><a href="#/title/${id}" class="rk-title"><b>${esc(BY_ID[id].title)}</b><small>${BY_ID[id].year} · ${BY_ID[id].kind}</small></a>${m.likes[id] ? '<span class="heart-on">❤</span>' : ''}${stars(m.ratings[id])}</li>`).join('')}</ol>` : '<p class="muted">Rate shows to build your personal ranking.</p>'}`,
    mount(root) {
      let dragId = null, selected = null;
      const save = () => store.setTiers(tiers);
      const rerender = () => { $('#board', root).innerHTML = board(); $('#pool', root).innerHTML = pool(); posters.paint(root); };
      const move = (id, to) => {
        for (const k of Object.keys(tiers)) tiers[k] = tiers[k].filter((x) => x !== id);
        if (to !== 'pool') tiers[to].push(id);
        save(); rerender();
      };
      root.addEventListener('dragstart', (e) => { const t = e.target.closest('.tile'); if (t) { dragId = t.dataset.id; t.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; } });
      root.addEventListener('dragend', (e) => { e.target.closest?.('.tile')?.classList.remove('dragging'); $$('.tier-drop', root).forEach((d) => d.classList.remove('over')); });
      root.addEventListener('dragover', (e) => { const d = e.target.closest('.tier-drop'); if (d) { e.preventDefault(); $$('.tier-drop', root).forEach((x) => x.classList.toggle('over', x === d)); } });
      root.addEventListener('drop', (e) => { const d = e.target.closest('.tier-drop'); if (d && dragId) { e.preventDefault(); move(dragId, d.dataset.tier); dragId = null; } });
      root.addEventListener('click', (e) => {
        const t = e.target.closest('.tile');
        if (t) { $$('.tile.sel', root).forEach((x) => x.classList.remove('sel')); if (selected === t.dataset.id) selected = null; else { selected = t.dataset.id; t.classList.add('sel'); } return; }
        const d = e.target.closest('.tier-drop');
        if (d && selected) { move(selected, d.dataset.tier); selected = null; return; }
        const k = e.target.closest('[data-k]');
        if (k) { kindFilter = k.dataset.k; import('../app.js').then((a) => a.refresh()); return; }
        const p = e.target.closest('[data-p]');
        if (p) { poolMode = p.dataset.p; import('../app.js').then((a) => a.refresh()); return; }
        if (e.target.closest('#auto')) {
          const map = (r) => (r >= 4.75 ? 'S' : r >= 4 ? 'A' : r >= 3 ? 'B' : r >= 2 ? 'C' : 'D');
          for (const id of Object.keys(m.ratings)) { for (const kk of Object.keys(tiers)) tiers[kk] = tiers[kk].filter((x) => x !== id); tiers[map(m.ratings[id])].push(id); }
          for (const id of Object.keys(m.likes)) if (!(id in m.ratings) && !placed().has(id)) tiers.A.push(id);
          save(); rerender(); toast('✨ Tier list generated from your ratings');
        }
        if (e.target.closest('#clear')) { for (const kk of Object.keys(tiers)) tiers[kk] = []; save(); rerender(); }
        if (e.target.closest('#share')) {
          const text = `My SeriesBox tier list\n` + TIERS.map(([kk]) => `${kk}: ${tiers[kk].map((id) => BY_ID[id].title).join(', ') || '—'}`).join('\n');
          navigator.clipboard?.writeText(text).then(() => toast('📋 Tier list copied to clipboard'), () => toast('Could not copy'));
        }
      });
    },
  };
}
