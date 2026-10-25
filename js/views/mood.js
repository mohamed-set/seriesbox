// Mood Match: pick a mood + time budget, the AI picks 3 shows.
import * as store from '../store.js';
import { MOODS, TIME_BUDGET, moodPick, BY_ID, chartStats, explain } from '../ai.js';
import { esc, poster, icon, fmt1, kindLabel, $ } from '../ui.js';
import * as posters from '../posters.js';

const sel = { mood: null, budget: 'Anything', kind: 'all' };

export function mood() {
  const m = store.me();
  return {
    html: `
    <div class="mood-page">
      <div class="page-head center"><h1>What should I watch tonight?</h1><p class="muted">Pick a mood. Our AI blends it with your taste profile and picks three shows for you.</p></div>
      <div class="moods">${Object.entries(MOODS).map(([k, v]) => `<button class="mood ${sel.mood === k ? 'on' : ''}" data-mood="${k}"><span>${v.emoji}</span>${k}</button>`).join('')}</div>
      <div class="mood-opts">
        <div class="seg">${Object.keys(TIME_BUDGET).map((k) => `<button data-budget="${k}" class="${sel.budget === k ? 'on' : ''}">${k}</button>`).join('')}</div>
        <div class="seg">${[['all', 'Both'], ['series', 'Series'], ['anime', 'Anime']].map(([k, l]) => `<button data-kind="${k}" class="${sel.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div id="mood-out" class="mood-out">${sel.mood ? '' : '<p class="muted center">👆 Choose a mood to get your picks</p>'}</div>
    </div>`,
    mount(root) {
      const out = $('#mood-out', root);
      const run = (animate = true) => {
        if (!sel.mood) return;
        const picks = moodPick(m, sel.mood, sel.budget, sel.kind, 3);
        const stats = chartStats(m);
        const liked = Object.keys(m.likes);
        out.innerHTML = picks.length ? `<div class="mood-cards">${picks.map((p, i) => {
          const t = BY_ID[p.id];
          const ref = liked.map((l) => [l, explain(l, t.id, 2)]).find(([, w]) => w.length);
          return `<a class="mood-card ${animate ? 'deal' : ''}" style="animation-delay:${i * 0.18}s" href="#/title/${t.id}">
            <div class="mood-rank">${['🥇', '🥈', '🥉'][i]}</div>${poster(t)}
            <div class="mood-info"><b>${esc(t.title)}</b><small>${t.year} · ${kindLabel(t)} · ${t.episodes} eps · ${t.runtime} min</small>
            <div class="mood-scores"><span>Mood fit <b>${Math.round(p.moodFit * 100)}%</b></span><span>Your taste <b>${Math.round(p.taste * 100)}%</b></span><span class="gold">★ ${fmt1(stats[t.id].avg)}</span></div>
            <p>${esc(t.tagline)}</p>${ref ? `<small class="muted">${icon.spark} Like ${esc(BY_ID[ref[0]].title)}: ${ref[1].map(esc).join(', ')}</small>` : ''}</div></a>`;
        }).join('')}</div><div class="center"><button class="btn glass" id="reroll">🎲 Shuffle with another mood</button></div>`
          : '<p class="muted center">No match for this combination, try another time budget.</p>';
        posters.paint(out);
      };
      root.addEventListener('click', (e) => {
        const md = e.target.closest('[data-mood]');
        if (md) { sel.mood = md.dataset.mood; root.querySelectorAll('.mood').forEach((x) => x.classList.toggle('on', x === md)); run(); return; }
        const b = e.target.closest('[data-budget]');
        if (b) { sel.budget = b.dataset.budget; root.querySelectorAll('[data-budget]').forEach((x) => x.classList.toggle('on', x === b)); run(); return; }
        const k = e.target.closest('[data-kind]');
        if (k) { sel.kind = k.dataset.kind; root.querySelectorAll('[data-kind]').forEach((x) => x.classList.toggle('on', x === k)); run(); return; }
        if (e.target.closest('#reroll')) {
          const keys = Object.keys(MOODS).filter((x) => x !== sel.mood);
          sel.mood = keys[Math.floor(Math.random() * keys.length)];
          root.querySelectorAll('.mood').forEach((x) => x.classList.toggle('on', x.dataset.mood === sel.mood));
          run();
        }
      });
      run(false);
    },
  };
}
