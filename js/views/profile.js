// Profile & stats ("Wrapped"-style), badges, settings.
import { TITLES } from '../data/titles.js';
import * as store from '../store.js';
import { BY_ID, tasteDNA, chartStats, neighbours } from '../ai.js';
import { esc, avatar, meUser, donut, PALETTE, fmt1, icon, toast, poster, stars } from '../ui.js';

export function profilePage() {
  const m = store.me();
  const stats = chartStats(m);
  const watchedIds = [...new Set([...Object.keys(m.ratings), ...Object.keys(m.status).filter((id) => m.status[id].state !== 'dropped')])].filter((id) => BY_ID[id]);
  let minutes = 0, episodes = 0;
  for (const id of watchedIds) {
    const t = BY_ID[id], st = m.status[id];
    const eps = st && st.state === 'watching' ? st.ep || 1 : t.episodes;
    episodes += eps; minutes += eps * t.runtime;
  }
  const hours = Math.round(minutes / 60);
  const ratings = Object.values(m.ratings);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const anime = watchedIds.filter((id) => BY_ID[id].kind === 'anime').length;
  const genreCount = {};
  watchedIds.forEach((id) => BY_ID[id].genres.forEach((g) => (genreCount[g] = (genreCount[g] || 0) + 1)));
  const genres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
  const topGenres = genres.slice(0, 6).map(([label, value], i) => ({ label, value, color: PALETTE[i] }));
  const dist = [1, 2, 3, 4, 5].map((s) => ratings.filter((r) => Math.ceil(r) === s).length);
  const dna = tasteDNA(m, 8);
  const maxDna = Math.max(...dna.map((d) => d.weight), 0.01);
  const diffs = Object.keys(m.ratings).map((id) => m.ratings[id] - stats[id].avg);
  const bias = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  const persona = bias > 0.4 ? ['The Enthusiast', 'You rate higher than the crowd. You see the best in every show.'] : bias < -0.4 ? ['The Tough Critic', 'You rate lower than the crowd. A 5★ from you means something.'] : ['The Balanced Critic', 'Your ratings closely follow the community consensus.'];
  const twin = neighbours(m.ratings)[0];
  const decades = {};
  watchedIds.forEach((id) => { const d = Math.floor(BY_ID[id].year / 10) * 10; decades[d] = (decades[d] || 0) + 1; });

  const badges = [
    ['🎌', 'Otaku', 'Watched 5+ anime', anime >= 5],
    ['📺', 'Binge Master', '100+ hours watched', hours >= 100],
    ['❤️', 'Big Heart', '10+ shows in Hearts', Object.keys(m.likes).length >= 10],
    ['✍️', 'Critic', 'Wrote 3+ reviews', Object.keys(m.reviews).length >= 3],
    ['🏆', 'Tier Maker', 'Ranked 10+ shows', Object.values(m.tiers).flat().length >= 10],
    ['🤝', 'Social', 'Follow 3+ people', m.following.length >= 3],
    ['🌍', 'Explorer', '8+ different genres', genres.length >= 8],
    ['⭐', 'Rater', 'Rated 20+ shows', ratings.length >= 20],
  ];

  return {
    html: `
    <section class="user-hero me">
      ${avatar(meUser(), 96)}
      <div class="user-info"><h1>${esc(m.profile.name)}</h1><p class="persona">${persona[0]}</p><p class="muted">${persona[1]}</p>
        ${twin ? `<p>Your taste twin: <a href="#/user/${twin.user.id}" class="link">${esc(twin.user.name)} · ${twin.score}%</a></p>` : ''}</div>
    </section>

    <div class="wrapped">
      <div class="stat-tile big"><span class="st-num">${hours}</span><span class="st-label">hours watched</span><small>${episodes.toLocaleString()} episodes · ${(hours / 24).toFixed(1)} days of your life</small></div>
      <div class="stat-tile"><span class="st-num">${watchedIds.length}</span><span class="st-label">shows</span><small>${watchedIds.length - anime} series · ${anime} anime</small></div>
      <div class="stat-tile"><span class="st-num">${Object.keys(m.likes).length}</span><span class="st-label">hearts</span></div>
      <div class="stat-tile"><span class="st-num">${fmt1(avg)}</span><span class="st-label">avg rating</span><small>${bias >= 0 ? '+' : ''}${fmt1(bias)} vs community</small></div>
      <div class="stat-tile"><span class="st-num">${Object.keys(m.reviews).length}</span><span class="st-label">reviews</span></div>
    </div>

    <div class="stats-grid">
      <section class="panel"><h3>Top genres</h3><div class="donut-wrap">${donut(topGenres)}<ul class="legend">${topGenres.map((g) => `<li><i style="background:${g.color}"></i>${esc(g.label)}<b>${g.value}</b></li>`).join('')}</ul></div></section>
      <section class="panel"><h3>Series vs anime</h3><div class="donut-wrap">${donut([{ label: 'Series', value: watchedIds.length - anime, color: '#ff2e63' }, { label: 'Anime', value: anime, color: '#8b5cf6' }])}<ul class="legend"><li><i style="background:#ff2e63"></i>Series<b>${watchedIds.length - anime}</b></li><li><i style="background:#8b5cf6"></i>Anime<b>${anime}</b></li></ul></div></section>
      <section class="panel"><h3>${icon.spark} Your taste DNA</h3><p class="muted">Strongest features of your AI taste profile</p>${dna.map((d) => `<div class="dna-bar"><span>${esc(d.label)}</span><div class="meter"><div style="width:${(d.weight / maxDna) * 100}%"></div></div></div>`).join('') || '<p class="muted">Rate shows to build it.</p>'}</section>
      <section class="panel"><h3>Your ratings</h3><div class="bars">${dist.map((c, i) => `<div class="bar"><div style="height:${(c / Math.max(1, ...dist)) * 100}%"></div><b>${c}</b><small>${i + 1}★</small></div>`).join('')}</div></section>
      <section class="panel"><h3>By decade</h3><div class="bars">${Object.entries(decades).sort().map(([d, c]) => `<div class="bar alt"><div style="height:${(c / Math.max(1, ...Object.values(decades))) * 100}%"></div><b>${c}</b><small>${d}s</small></div>`).join('')}</div></section>
      <section class="panel"><h3>Badges</h3><div class="badges">${badges.map(([e, n, d, ok]) => `<div class="badge-item ${ok ? 'ok' : ''}" title="${d}"><span>${e}</span><b>${n}</b><small>${d}</small></div>`).join('')}</div></section>
    </div>

    <section class="panel settings"><h3>Settings</h3>
      <div class="settings-row"><button class="btn glass" id="demo-fill">${icon.spark} Fill with demo activity</button><button class="btn glass" id="export">Export my data (JSON)</button><button class="btn ghost danger" id="reset">Reset profile</button></div>
      <p class="muted">Your data is stored only in this browser (localStorage).</p>
    </section>`,
    mount(root) {
      root.querySelector('#reset').addEventListener('click', () => { if (confirmReset()) { store.reset(); location.hash = '#/'; location.reload(); } });
      root.querySelector('#export').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' }));
        a.download = 'seriesbox-profile.json'; a.click();
      });
      root.querySelector('#demo-fill').addEventListener('click', () => { fillDemo(); toast('✨ Demo activity added'); import('../app.js').then((a) => a.refresh()); });
    },
  };
}

function confirmReset() {
  const b = document.querySelector('#reset');
  if (b.dataset.armed) return true;
  b.dataset.armed = '1'; b.textContent = 'Click again to confirm';
  setTimeout(() => { delete b.dataset.armed; b.textContent = 'Reset profile'; }, 3000);
  return false;
}

/** Adds a believable history (ratings, hearts, a review, a show in progress) for presentations. */
export function fillDemo() {
  const m = store.me();
  const ids = ['breaking-bad', 'dark', 'attack-on-titan', 'death-note', 'the-office-us', 'arcane', 'succession', 'frieren-beyond-journeys-end', 'steins-gate', 'chernobyl', 'fullmetal-alchemist-brotherhood', 'stranger-things', 'squid-game', 'one-piece', 'the-bear', 'money-heist', 'friends', 'jujutsu-kaisen', 'severance', 'game-of-thrones', 'sherlock', 'cowboy-bebop', 'the-witcher', 'spy-x-family'];
  const r = [5, 5, 5, 4.5, 4, 5, 4.5, 5, 4.5, 5, 4.5, 4, 3.5, 4, 4.5, 3.5, 3, 4, 4.5, 3, 4, 4.5, 2.5, 4];
  ids.forEach((id, i) => { if (BY_ID[id] && !(id in m.ratings)) store.rate(id, r[i]); });
  ids.filter((_, i) => r[i] >= 4.5).forEach((id) => { if (BY_ID[id] && !m.likes[id]) store.toggleLike(id); });
  if (BY_ID['dark'] && !m.reviews['dark']) store.saveReview('dark', 'Needed a whiteboard for the family trees and loved every second. The best time travel story on TV.', false);
  if (BY_ID['game-of-thrones'] && !m.reviews['game-of-thrones']) store.saveReview('game-of-thrones', 'Seasons 1 to 4 are legendary. The ending ruined the rewatch value for me.', true);
  if (BY_ID['vinland-saga']) store.setStatus('vinland-saga', { state: 'watching', ep: 14 });
  ['the-last-of-us', 'mindhunter', 'monster'].forEach((id) => { if (BY_ID[id] && !m.watchlist.includes(id)) store.toggleWatchlist(id); });
}
