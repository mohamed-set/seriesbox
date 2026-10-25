// AI Lab: explains and evaluates the recommender (for the business / course presentation).
import { TITLES, CATALOG_INFO } from '../data/titles.js';
import { COMMUNITY } from '../data/community.js';
import * as store from '../store.js';
import { BY_ID, VEC, IDF, VOCAB_SIZE, similar, evaluate, tasteDNA, recommend, FEATURE_LABEL } from '../ai.js';
import { esc, icon, poster, $ } from '../ui.js';
import * as posters from '../posters.js';

let probe = 'breaking-bad';
let evalCache = null;

export function lab() {
  const m = store.me();
  if (!BY_ID[probe]) probe = TITLES[0].id;
  const t = BY_ID[probe];
  const vec = Object.entries(VEC[probe]).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const sims = similar(probe, 6);
  const nRatings = Object.values(COMMUNITY.ratings).reduce((a, r) => a + Object.keys(r).length, 0);
  const recs = recommend(m, 5);

  const heat = TITLES.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 14);
  const simOf = (a, b) => (a === b ? 1 : Object.keys(VEC[a]).reduce((s, k) => s + (VEC[b][k] ? VEC[a][k] * VEC[b][k] : 0), 0));

  return {
    html: `
    <div class="page-head"><h1>${icon.spark} AI Lab</h1><p class="muted">How SeriesBox recommends shows, and how well it works. Everything runs live in your browser.</p></div>

    <div class="lab-kpis">
      <div class="stat-tile"><span class="st-num">${TITLES.length}</span><span class="st-label">titles in catalog</span><small>${CATALOG_INFO.source}</small></div>
      <div class="stat-tile"><span class="st-num">${VOCAB_SIZE.toLocaleString()}</span><span class="st-label">TF-IDF features</span><small>genres, themes, creators, synopsis words</small></div>
      <div class="stat-tile"><span class="st-num">${COMMUNITY.users.length + 1}</span><span class="st-label">users</span><small>${nRatings.toLocaleString()} ratings · ${COMMUNITY.reviews.length} reviews</small></div>
      <div class="stat-tile"><span class="st-num">${Object.keys(m.ratings).length + Object.keys(m.likes).length}</span><span class="st-label">your signals</span><small>ratings + hearts feeding your profile</small></div>
    </div>

    <section class="panel pipeline">
      <h3>The pipeline</h3>
      <div class="pipe">
        <div class="pipe-step"><span>1</span><b>Catalog</b><small>Series from TVmaze, anime from AniList (public APIs), refreshed weekly by a GitHub Action.</small></div>
        <div class="pipe-step"><span>2</span><b>Content model</b><small>Each show → weighted TF-IDF vector (genres ×2.2, themes ×1.6, creator ×1.2, synopsis ×0.45).</small></div>
        <div class="pipe-step"><span>3</span><b>Taste profile</b><small>Your hearts and ratings (centred on your mean) are summed into one vector.</small></div>
        <div class="pipe-step"><span>4</span><b>Collaborative filtering</b><small>k-NN on users: Pearson similarity on co-rated shows, shrunk by overlap size.</small></div>
        <div class="pipe-step"><span>5</span><b>Hybrid ranking</b><small>α·content + (1-α)·CF + quality prior. α decreases as we learn more about you (cold start).</small></div>
      </div>
    </section>

    <div class="lab-grid">
      <section class="panel">
        <h3>Inside a vector</h3>
        <select class="select" id="probe">${TITLES.slice().sort((a, b) => a.title.localeCompare(b.title)).map((x) => `<option value="${x.id}" ${x.id === probe ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>
        <div class="vec">${vec.map(([k, w]) => `<div class="dna-bar"><span><em class="ft ft-${k[0]}">${{ g: 'genre', t: 'theme', c: 'creator', w: 'word', k: 'type', d: 'era' }[k[0]]}</em>${esc(FEATURE_LABEL(k))}</span><div class="meter"><div style="width:${(w / vec[0][1]) * 100}%"></div></div><b>${w.toFixed(2)}</b></div>`).join('')}</div>
        <h4>Nearest neighbours of ${esc(t.title)}</h4>
        ${sims.map((x) => `<a class="why-row" href="#/title/${x.id}"><span>${esc(BY_ID[x.id].title)}</span><div class="meter"><div style="width:${x.match}%"></div></div><b>${x.score.toFixed(2)}</b><small>${x.why.map(esc).join(' · ')}</small></a>`).join('')}
      </section>
      <section class="panel">
        <h3>Similarity heatmap</h3>
        <p class="muted">Cosine similarity between the 14 most popular titles. Darker = closer.</p>
        <div class="heat" style="grid-template-columns: 110px repeat(${heat.length}, 1fr)">
          <span></span>${heat.map((h) => `<span class="heat-col" title="${esc(h.title)}">${esc(h.title.slice(0, 3))}</span>`).join('')}
          ${heat.map((a) => `<span class="heat-row">${esc(a.title.slice(0, 16))}</span>${heat.map((b) => { const s = simOf(a.id, b.id); return `<span class="cell" style="--s:${a.id === b.id ? 1 : Math.min(1, s * 1.6)}" title="${esc(a.title)} × ${esc(b.title)}: ${s.toFixed(2)}"></span>`; }).join('')}`).join('')}
        </div>
      </section>
    </div>

    <section class="panel">
      <h3>Offline evaluation</h3>
      <p class="muted">Leave-one-out test: for each community member we hide one show they loved (4.5★+), let each model rank all unseen shows, and check if the hidden one is in its top 10 (Hit Rate@10). Higher is better.</p>
      <button class="btn primary" id="run-eval">${evalCache ? 'Re-run evaluation' : 'Run evaluation'}</button>
      <div id="eval-out">${evalCache ? evalHtml(evalCache) : ''}</div>
    </section>

    <section class="panel">
      <h3>Your profile right now</h3>
      <div class="dna-chips static">${tasteDNA(m, 10).map((d) => `<span class="chip ai">${esc(d.label)}</span>`).join('') || '<span class="muted">No signals yet.</span>'}</div>
      <div class="lab-recs">${recs.map((r) => `<a href="#/title/${r.id}" class="lab-rec">${poster(BY_ID[r.id], 'xs')}<div><b>${esc(BY_ID[r.id].title)}</b><small>content ${r.content.toFixed(2)} · CF ${r.cf ? r.cf.pred.toFixed(1) + '★ (' + r.cf.support + ' users)' : 'n/a'} · match ${r.match}%</small></div></a>`).join('')}</div>
    </section>

    <section class="panel">
      <h3>Business value</h3>
      <div class="biz">
        <div><b>Engagement</b><small>Personalised rows and “because you loved X” explanations increase clicks and time spent, the core KPI of streaming apps.</small></div>
        <div><b>Cold start solved</b><small>The 3-pick onboarding gives the content model enough signal from the very first session.</small></div>
        <div><b>Community network effect</b><small>Taste twins and review comparison turn solo tracking into a social product.</small></div>
        <div><b>Monetisation</b><small>Affiliate links to platforms, sponsored placements in mood picks, premium stats (“Wrapped”).</small></div>
      </div>
    </section>`,
    mount(root) {
      $('#probe', root).addEventListener('change', (e) => { probe = e.target.value; import('../app.js').then((a) => a.refresh()); });
      $('#run-eval', root).addEventListener('click', (e) => {
        e.target.disabled = true; e.target.textContent = 'Evaluating…';
        setTimeout(() => {
          const t0 = performance.now();
          evalCache = { ...evaluate(10), ms: Math.round(performance.now() - t0) };
          $('#eval-out', root).innerHTML = evalHtml(evalCache);
          e.target.disabled = false; e.target.textContent = 'Re-run evaluation';
        }, 50);
      });
      posters.paint(root);
    },
  };
}

function evalHtml(ev) {
  const best = Math.max(...ev.results.map((r) => r.hitRate));
  return `<div class="eval">${ev.results.map((r) => `<div class="eval-row ${r.hitRate === best ? 'best' : ''}"><span>${r.name}</span><div class="meter"><div style="width:${r.hitRate * 100}%"></div></div><b>${(r.hitRate * 100).toFixed(1)}%</b></div>`).join('')}
    <small class="muted">${ev.trials} hidden shows · K=${ev.K} · computed in ${ev.ms} ms. Community data is simulated, so treat absolute numbers as illustrative.</small></div>`;
}
