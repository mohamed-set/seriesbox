import { TITLES } from '../data/titles.js';
import { COMMUNITY } from '../data/community.js';
import * as store from '../store.js';
import { BY_ID, similar, fansAlsoLoved, chartStats, cfPredict, compatibility } from '../ai.js';
import { card, row, esc, icon, fmt1, years, kindLabel, avatar, stars, starInput, histogram, timeAgo, userById, poster, toast, $, $$ } from '../ui.js';
import { refresh } from '../app.js';

let reviewTab = 'popular';

export function titlePage(id) {
  const t = BY_ID[id];
  if (!t) return { html: '<div class="empty"><h2>Title not found</h2><a href="#/">Back home</a></div>' };
  const m = store.me();
  const stats = chartStats(m);
  const s = stats[id];
  const mine = m.ratings[id];
  const liked = !!m.likes[id];
  const inList = m.watchlist.includes(id);
  const st = m.status[id] || {};

  const rankAll = Object.values(stats).sort((a, b) => b.weighted - a.weighted).findIndex((x) => x.id === id) + 1;
  const rankKind = Object.values(stats).filter((x) => BY_ID[x.id].kind === t.kind).sort((a, b) => b.weighted - a.weighted).findIndex((x) => x.id === id) + 1;

  // AI predicted rating for this user (collaborative filtering).
  let prediction = null;
  if (!mine && Object.keys(m.ratings).length >= 3) {
    const p = cfPredict(m.ratings)[id];
    if (p) prediction = p;
  }

  // Reviews: community + mine.
  const reviews = COMMUNITY.reviews.filter((r) => r.titleId === id).map((r) => ({ ...r, compat: compatibility(m.ratings, COMMUNITY.ratings[r.userId]).score }));
  const myReview = m.reviews[id];
  let shown = [...reviews];
  if (reviewTab === 'popular') shown.sort((a, b) => b.likes - a.likes);
  if (reviewTab === 'recent') shown.sort((a, b) => b.date.localeCompare(a.date));
  if (reviewTab === 'agree' && mine) shown = shown.filter((r) => Math.abs(r.rating - mine) <= 0.5).sort((a, b) => (b.compat || 0) - (a.compat || 0));
  if (reviewTab === 'disagree' && mine) shown = shown.filter((r) => Math.abs(r.rating - mine) >= 1.5).sort((a, b) => Math.abs(b.rating - mine) - Math.abs(a.rating - mine));
  if (reviewTab === 'following') shown = shown.filter((r) => m.following.includes(r.userId));

  const following = m.following.filter((u) => COMMUNITY.ratings[u][id] !== undefined);

  const compareBox = mine ? (() => {
    const diff = mine - s.avg;
    const verdict = Math.abs(diff) < 0.35 ? 'You agree with the crowd' : diff > 0 ? `You like it more than most (+${fmt1(diff)})` : `You’re harsher than most (${fmt1(diff)})`;
    const agreeN = reviews.filter((r) => Math.abs(r.rating - mine) <= 0.5).length;
    return `<div class="panel compare-box">
      <h3>You vs the community</h3>
      <div class="vs">
        <div><span class="vs-num you">${fmt1(mine)}</span><small>You</small></div>
        <div class="vs-bar"><div class="vs-track"><span class="dot you" style="left:${(mine / 5) * 100}%"></span><span class="dot crowd" style="left:${(s.avg / 5) * 100}%"></span></div><b>${verdict}</b></div>
        <div><span class="vs-num">${fmt1(s.avg)}</span><small>Community</small></div>
      </div>
      <p class="muted">${agreeN} of ${reviews.length} reviewers agree with you within half a star. <a href="#" data-tab="disagree" class="link">See who disagrees →</a></p>
    </div>`;
  })() : prediction ? `<div class="panel predict">
      <div class="predict-num">${fmt1(prediction.pred)}<small>★</small></div>
      <div><h3>${icon.spark} We think you’ll rate it ${fmt1(prediction.pred)}</h3><p class="muted">Predicted by collaborative filtering from ${prediction.support} fans with a taste close to yours.</p></div>
    </div>` : '';

  const sims = similar(id, 14);
  const fans = fansAlsoLoved(id, m, 12);

  const html = `
  <section class="detail-hero">
    <div class="detail-bg" data-banner="${id}" style="--accent:${t.accent}"></div>
    <div class="detail-shade"></div>
    <div class="detail-main">
      ${poster(t, 'lg')}
      <div class="detail-info">
        <div class="chips">${t.genres.map((g) => `<span class="chip">${esc(g)}</span>`).join('')}<span class="chip ghost">${kindLabel(t)}</span></div>
        <h1>${esc(t.title)}</h1>
        <p class="tagline">${esc(t.tagline)}</p>
        <div class="detail-meta"><span>${years(t)}</span><span>${t.seasons} season${t.seasons > 1 ? 's' : ''} · ${t.episodes} eps</span><span>${t.runtime} min</span><span>${esc(t.network)}</span><span>${esc(t.creator)}</span><span class="status ${t.status === 'Ongoing' ? 'on' : ''}">${t.status}</span></div>
        <p class="syn">${esc(t.synopsis)}</p>
        <div class="detail-actions">
          ${starInput(id, mine || 0)}
          <button class="btn ${liked ? 'liked' : 'glass'}" data-act="like" data-id="${id}">${icon.heart(liked)} ${liked ? 'In your Hearts' : 'Love it'}</button>
          <button class="btn glass" data-act="watchlist" data-id="${id}">${inList ? icon.check : icon.plus} Watchlist</button>
          <select id="status" class="select">
            <option value="">Status…</option>
            ${[['watching', 'Watching'], ['completed', 'Completed'], ['dropped', 'Dropped']].map(([v, l]) => `<option value="${v}" ${st.state === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          ${st.state === 'watching' ? `<label class="ep">Ep <input id="ep" type="number" min="1" max="${t.episodes}" value="${st.ep || 1}"> / ${t.episodes}</label>` : ''}
        </div>
        <div class="tags">${t.tags.map((g) => `<span class="tag">#${esc(g)}</span>`).join('')}</div>
      </div>
    </div>
  </section>

  <div class="detail-grid">
    <div class="col-main">
      ${compareBox}
      <div class="panel">
        <h3>Your review</h3>
        <textarea id="review-text" placeholder="What did you think of ${esc(t.title)}?" rows="3">${esc(myReview ? myReview.text : '')}</textarea>
        <div class="review-bar"><label class="check"><input type="checkbox" id="review-spoiler" ${myReview && myReview.spoiler ? 'checked' : ''}> Contains spoilers</label><button class="btn primary" id="review-save">${myReview ? 'Update review' : 'Post review'}</button></div>
      </div>

      <div class="panel">
        <div class="reviews-head"><h3>Reviews <span class="muted">${reviews.length + (myReview ? 1 : 0)}</span></h3>
          <div class="seg sm">${[['popular', 'Popular'], ['recent', 'Recent'], ...(mine ? [['agree', 'Agree with me'], ['disagree', 'Disagree']] : []), ['following', 'Following']].map(([k, l]) => `<button data-tab="${k}" class="${reviewTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        </div>
        ${!mine ? '<p class="muted hint">Rate this show to compare your opinion with every reviewer.</p>' : ''}
        <div class="reviews">
          ${myReview ? reviewItem({ id: 'me:' + id, userId: 'me', rating: mine, text: myReview.text, date: myReview.date, likes: 0, spoiler: myReview.spoiler }, null, mine, m) : ''}
          ${shown.slice(0, 12).map((r) => reviewItem(r, r.compat, mine, m)).join('') || '<p class="muted">No reviews here yet.</p>'}
        </div>
      </div>
    </div>

    <aside class="col-side">
      <div class="panel score-panel">
        <div class="big-score"><span>${fmt1(s.avg)}</span>${stars(s.avg)}</div>
        <div class="score-sub"><b>${s.n}</b> ratings · <b>${s.likes}</b> ❤ · <b>${reviews.length}</b> reviews</div>
        ${histogram(s.hist, mine)}
        <div class="ranks"><a href="#/charts"><b>#${rankAll}</b><small>overall</small></a><a href="#/charts"><b>#${rankKind}</b><small>in ${t.kind === 'anime' ? 'anime' : 'series'}</small></a><span><b>${fmt1(s.std)}</b><small>controversy σ</small></span></div>
      </div>
      ${following.length ? `<div class="panel"><h3>People you follow</h3>${following.map((u) => `<a class="fr" href="#/user/${u}">${avatar(userById(u), 30)}<span>${esc(userById(u).name)}</span>${stars(COMMUNITY.ratings[u][id], 'sm')}</a>`).join('')}</div>` : ''}
      <div class="panel ai-panel">
        <h3>${icon.spark} Why it’s similar</h3>
        <p class="muted">Our content model compares shows by genres, themes, creators and synopsis (TF-IDF + cosine similarity).</p>
        ${sims.slice(0, 4).map((x) => `<a class="why-row" href="#/title/${x.id}"><span>${esc(BY_ID[x.id].title)}</span><div class="meter"><div style="width:${x.match}%"></div></div><b>${x.match}%</b><small>${x.why.map(esc).join(' · ')}</small></a>`).join('')}
      </div>
    </aside>
  </div>

  <div class="rows">
    ${row('More like this', sims.map((x) => card(BY_ID[x.id], { match: x.match, why: x.why })), { sub: `${icon.spark} Content-based AI` , cls: 'ai-row' })}
    ${row('Fans also loved', fans.map((x) => card(BY_ID[x.id], { badge: `${x.fans} shared fans` })), { sub: 'Collaborative filtering: people who ❤ this also ❤' })}
  </div>`;

  return {
    html,
    mount(root) {
      $('#status', root).addEventListener('change', (e) => {
        store.setStatus(id, e.target.value ? { state: e.target.value, ep: st.ep || 1 } : null);
        if (e.target.value === 'watching' && m.watchlist.includes(id)) store.toggleWatchlist(id);
        toast(e.target.value ? `Marked as <b>${e.target.value}</b>` : 'Status cleared');
        refresh();
      });
      const ep = $('#ep', root);
      if (ep) ep.addEventListener('change', () => {
        const v = Math.max(1, Math.min(t.episodes, Number(ep.value) || 1));
        store.setStatus(id, v >= t.episodes ? { state: 'completed', ep: v } : { ep: v });
        if (v >= t.episodes) { toast('🎉 Finished! Don’t forget to rate it.'); refresh(); }
      });
      $('#review-save', root).addEventListener('click', () => {
        const text = $('#review-text', root).value;
        if (text.trim() && !store.me().ratings[id]) { toast('Give it a star rating first ★'); $('.star-input', root).classList.add('shake'); setTimeout(() => $('.star-input', root).classList.remove('shake'), 500); return; }
        store.saveReview(id, text, $('#review-spoiler', root).checked);
        toast(text.trim() ? '✍️ Review posted' : 'Review deleted');
        refresh();
      });
      root.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) { e.preventDefault(); reviewTab = tab.dataset.tab; refresh(); setTimeout(() => $('.reviews-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); return; }
        const rl = e.target.closest('[data-rlike]');
        if (rl) { e.preventDefault(); store.toggleReviewLike(rl.dataset.rlike); refresh(); return; }
        const sp = e.target.closest('.spoiler-cover');
        if (sp) sp.classList.add('revealed');
      });
    },
    unmount() {},
  };
}

function reviewItem(r, compat, mine, m) {
  const u = userById(r.userId);
  const liked = !!m.reviewLikes[r.id];
  const diff = mine && r.userId !== 'me' ? r.rating - mine : null;
  return `<article class="review ${r.userId === 'me' ? 'mine' : ''}">
    <a href="${r.userId === 'me' ? '#/profile' : `#/user/${r.userId}`}">${avatar(u, 40)}</a>
    <div class="rv-body">
      <div class="rv-head"><a href="${r.userId === 'me' ? '#/profile' : `#/user/${r.userId}`}"><b>${esc(u.name)}</b></a>${stars(r.rating, 'sm')}
        ${compat !== null && compat !== undefined ? `<span class="pill ${compat >= 70 ? 'good' : compat < 45 ? 'bad' : ''}">${compat}% taste match</span>` : ''}
        ${diff !== null ? `<span class="pill ${Math.abs(diff) <= 0.5 ? 'good' : Math.abs(diff) >= 1.5 ? 'bad' : ''}">${Math.abs(diff) <= 0.5 ? 'Agrees with you' : diff > 0 ? `+${fmt1(diff)} vs you` : `${fmt1(diff)} vs you`}</span>` : ''}
        <small class="muted">${timeAgo(r.date)}</small></div>
      <p class="${r.spoiler ? 'spoiler-cover' : ''}">${esc(r.text)}</p>
      ${r.userId !== 'me' ? `<button class="rv-like ${liked ? 'on' : ''}" data-rlike="${r.id}">${icon.heart(liked)} ${r.likes + (liked ? 1 : 0)}</button>` : ''}
    </div>
  </article>`;
}
