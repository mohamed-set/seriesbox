// First visit: create a profile and pick a few favourites (solves the recommender cold start).
import { TITLES } from '../data/titles.js';
import * as store from '../store.js';
import { tasteDNA, recommend, BY_ID } from '../ai.js';
import { $, $$, esc, poster, PALETTE } from '../ui.js';
import * as posters from '../posters.js';

export function onboarding() {
  const picks = new Set();
  let name = '';
  let color = PALETTE[0];
  let filter = 'all';
  const pool = [...TITLES].sort((a, b) => b.popularity - a.popularity);

  const step1 = () => `
    <div class="onb">
      <div class="onb-bg">${pool.slice(0, 24).map((t) => poster(t)).join('')}</div>
      <div class="onb-card">
        <div class="logo big"><span>SERIES</span>BOX</div>
        <h1>Track every show you watch.<br><span class="grad">Discover the next one with AI.</span></h1>
        <p class="muted">Rate series and anime, keep a list of the ones you love, build your rankings and compare your taste with other fans.</p>
        <label class="field"><span>Your name</span><input id="onb-name" maxlength="24" placeholder="e.g. Moha" value="${esc(name)}"></label>
        <div class="colors">${PALETTE.slice(0, 8).map((c) => `<button class="color ${c === color ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="Avatar color"></button>`).join('')}</div>
        <button class="btn primary lg" id="onb-next">Get started</button>
      </div>
    </div>`;

  const step2 = () => {
    const list = pool.filter((t) => filter === 'all' || t.kind === filter);
    return `
    <div class="onb2">
      <div class="onb2-head">
        <div>
          <h1>Pick 3+ shows you love, ${esc(name)}</h1>
          <p class="muted">Our AI builds your taste profile from these picks. They go straight into your Hearts.</p>
        </div>
        <div class="seg">${['all', 'series', 'anime'].map((k) => `<button class="${filter === k ? 'on' : ''}" data-f="${k}">${k === 'all' ? 'All' : k === 'series' ? 'Series' : 'Anime'}</button>`).join('')}</div>
      </div>
      <div class="pick-grid">${list.map((t) => `<button class="pick ${picks.has(t.id) ? 'on' : ''}" data-id="${t.id}">${poster(t)}<span class="pick-check">❤</span><span class="pick-title">${esc(t.title)}</span></button>`).join('')}</div>
      <div class="onb2-bar"><span><b id="pick-count">${picks.size}</b> selected</span><button class="btn primary" id="onb-done" ${picks.size < 3 ? 'disabled' : ''}>Build my taste profile</button></div>
    </div>`;
  };

  const step3 = () => {
    const m = store.me();
    const dna = tasteDNA(m, 10);
    const recs = recommend(m, 5);
    return `
    <div class="onb3">
      <div class="ai-orb"></div>
      <h1>Analyzing your taste…</h1>
      <p class="muted">TF-IDF vectors of ${[...picks].length} shows → your taste profile</p>
      <div class="dna-chips">${dna.map((d, i) => `<span class="chip ai" style="animation-delay:${0.3 + i * 0.18}s">${esc(d.label)}</span>`).join('')}</div>
      <div class="onb3-recs">${recs.map((r, i) => `<div class="onb3-rec" style="animation-delay:${2 + i * 0.2}s">${poster(BY_ID[r.id])}<b>${r.match}%</b></div>`).join('')}</div>
      <button class="btn primary lg onb3-go" id="onb-go" style="animation-delay:3s">Enter SeriesBox</button>
    </div>`;
  };

  return {
    html: `<div id="onb-root">${step1()}</div>`,
    mount(root) {
      const r = $('#onb-root', root);
      const paint = (html) => { r.innerHTML = html; posters.paint(r); };
      r.addEventListener('input', (e) => { if (e.target.id === 'onb-name') name = e.target.value; });
      r.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'onb-name') $('#onb-next').click(); });
      r.addEventListener('click', (e) => {
        const c = e.target.closest('.color');
        if (c) { color = c.dataset.c; $$('.color', r).forEach((x) => x.classList.toggle('on', x === c)); return; }
        if (e.target.closest('#onb-next')) {
          if (!name.trim()) { $('#onb-name').focus(); $('#onb-name').classList.add('shake'); setTimeout(() => $('#onb-name').classList.remove('shake'), 500); return; }
          paint(step2()); window.scrollTo(0, 0); return;
        }
        const f = e.target.closest('[data-f]');
        if (f) { filter = f.dataset.f; paint(step2()); return; }
        const p = e.target.closest('.pick');
        if (p) {
          const id = p.dataset.id;
          picks.has(id) ? picks.delete(id) : picks.add(id);
          p.classList.toggle('on');
          $('#pick-count').textContent = picks.size;
          $('#onb-done').disabled = picks.size < 3;
          return;
        }
        if (e.target.closest('#onb-done')) {
          store.seedProfile({ name: name.trim(), color }, [...picks]);
          paint(step3()); window.scrollTo(0, 0); return;
        }
        if (e.target.closest('#onb-go')) { location.hash = '#/'; window.dispatchEvent(new HashChangeEvent('hashchange')); }
      });
    },
  };
}
