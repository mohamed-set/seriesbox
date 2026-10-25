// Community: taste twins, members, activity feed, and user-vs-user comparison.
import { COMMUNITY, USER_BY_ID } from '../data/community.js';
import * as store from '../store.js';
import { BY_ID, neighbours, compatibility, tasteDNA } from '../ai.js';
import { card, row, esc, avatar, stars, timeAgo, poster, fmt1, icon, userById } from '../ui.js';

function ring(score, size = 120) {
  const c = score >= 70 ? '#34d399' : score >= 50 ? '#facc15' : '#ff2e63';
  return `<div class="ring" style="--p:${score};--c:${c};width:${size}px;height:${size}px"><span>${score}<small>%</small></span></div>`;
}

let feedTab = 'all';

export function community() {
  const m = store.me();
  const nb = neighbours(m.ratings);
  const enough = Object.keys(m.ratings).length >= 2;
  const twins = nb.slice(0, 6);
  const opposites = [...nb].sort((a, b) => a.sim - b.sim).slice(0, 3);
  const feed = COMMUNITY.reviews.filter((r) => feedTab === 'all' || m.following.includes(r.userId)).slice(0, 25);

  const userCard = (x) => `<a class="twin" href="#/user/${x.user.id}">${avatar(x.user, 56)}<b>${esc(x.user.name)}</b><small>@${esc(x.user.handle)}</small>${ring(x.score, 74)}<small class="muted">${x.common.length} shows in common</small></a>`;

  return {
    html: `
    <div class="page-head"><h1>Community</h1><p class="muted">Find people who share your taste, compare reviews and follow their activity.</p></div>
    ${enough ? `<section class="row"><div class="row-head"><h2>Your taste twins</h2><span class="row-sub">${icon.spark} Compatibility = Pearson correlation on co-rated shows, shrunk by sample size</span></div>
      <div class="twins">${twins.map(userCard).join('')}</div></section>
      <section class="row"><div class="row-head"><h2>Your opposites</h2><span class="row-sub">Great for heated debates</span></div><div class="twins small">${opposites.map(userCard).join('')}</div></section>`
    : '<div class="panel"><p>Rate at least 2 shows to discover your taste twins.</p></div>'}
    <div class="community-grid">
      <section class="panel">
        <div class="reviews-head"><h3>Activity</h3><div class="seg sm"><button data-feed="all" class="${feedTab === 'all' ? 'on' : ''}">Everyone</button><button data-feed="following" class="${feedTab === 'following' ? 'on' : ''}">Following (${m.following.length})</button></div></div>
        ${feed.map((r) => { const u = USER_BY_ID[r.userId], t = BY_ID[r.titleId]; return `<div class="feed-item"><a href="#/user/${u.id}">${avatar(u, 38)}</a><div><div><a href="#/user/${u.id}"><b>${esc(u.name)}</b></a> reviewed <a href="#/title/${t.id}"><b>${esc(t.title)}</b></a> ${stars(r.rating, 'sm')}</div><p>${esc(r.text)}</p><small class="muted">${timeAgo(r.date)} · ♥ ${r.likes}</small></div><a href="#/title/${t.id}">${poster(t, 'xs')}</a></div>`; }).join('') || '<p class="muted">Follow people to see their activity here.</p>'}
      </section>
      <section class="panel">
        <h3>Members</h3>
        ${COMMUNITY.users.map((u) => { const c = compatibility(m.ratings, COMMUNITY.ratings[u.id]); const f = m.following.includes(u.id); return `<div class="member"><a href="#/user/${u.id}">${avatar(u, 36)}</a><a href="#/user/${u.id}" class="member-name"><b>${esc(u.name)}</b><small>${esc(u.bio)}</small></a>${c.score !== null ? `<span class="pill ${c.score >= 70 ? 'good' : c.score < 45 ? 'bad' : ''}">${c.score}%</span>` : ''}<button class="btn sm ${f ? 'glass' : 'primary'}" data-follow="${u.id}">${f ? 'Following' : 'Follow'}</button></div>`; }).join('')}
      </section>
    </div>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const fb = e.target.closest('[data-follow]');
        if (fb) { e.preventDefault(); store.toggleFollow(fb.dataset.follow); import('../app.js').then((a) => a.refresh()); }
        const ft = e.target.closest('[data-feed]');
        if (ft) { feedTab = ft.dataset.feed; import('../app.js').then((a) => a.refresh()); }
      });
    },
  };
}

export function userPage(uid) {
  const u = USER_BY_ID[uid];
  if (!u) return { html: '<div class="empty"><h2>User not found</h2></div>' };
  const m = store.me();
  const theirs = COMMUNITY.ratings[uid];
  const theirLikes = COMMUNITY.likes[uid];
  const c = compatibility(m.ratings, theirs);
  const following = m.following.includes(uid);
  const common = c.common;
  const bothLoved = common.filter((id) => m.ratings[id] >= 4 && theirs[id] >= 4).sort((a, b) => theirs[b] + m.ratings[b] - theirs[a] - m.ratings[a]);
  const disagreements = common.map((id) => ({ id, d: theirs[id] - m.ratings[id] })).filter((x) => Math.abs(x.d) >= 1).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 6);
  const fromThem = Object.keys(theirs).filter((id) => theirs[id] >= 4 && !(id in m.ratings) && !m.likes[id]).sort((a, b) => theirs[b] - theirs[a]);
  const reviews = COMMUNITY.reviews.filter((r) => r.userId === uid);
  const review = (id) => reviews.find((r) => r.titleId === id);
  const meU = userById('me');

  const dnaThem = tasteDNA({ ratings: theirs, likes: theirLikes }, 8).map((d) => d.label);
  const dnaMe = tasteDNA(m, 8).map((d) => d.label);
  const shared = dnaThem.filter((x) => dnaMe.includes(x));

  const n = Object.keys(theirs).length;
  const avg = Object.values(theirs).reduce((a, b) => a + b, 0) / n;

  return {
    html: `
    <section class="user-hero">
      ${avatar(u, 96)}
      <div class="user-info"><h1>${esc(u.name)}</h1><p class="muted">@${esc(u.handle)} · joined ${u.joined} · ${u.followers.toLocaleString()} followers</p><p>${esc(u.bio)}</p>
        <div class="user-stats"><span><b>${n}</b> rated</span><span><b>${Object.keys(theirLikes).length}</b> hearts</span><span><b>${reviews.length}</b> reviews</span><span><b>${fmt1(avg)}★</b> avg rating</span></div>
        <button class="btn ${following ? 'glass' : 'primary'}" data-follow="${uid}">${following ? '✓ Following' : '＋ Follow'}</button>
      </div>
    </section>

    <section class="panel compat-panel">
      <div class="compat-left">${c.score !== null ? ring(c.score, 150) : '<div class="ring empty-ring"><span>?</span></div>'}<h3>Taste compatibility</h3><p class="muted">${common.length} shows rated by both of you</p></div>
      <div class="compat-right">
        <div class="vs-users">${avatar(meU, 44)}<span>vs</span>${avatar(u, 44)}</div>
        <h4>Taste DNA</h4>
        <div class="dna-compare"><div><small>You</small>${dnaMe.map((d) => `<span class="chip ${shared.includes(d) ? 'ai' : ''}">${esc(d)}</span>`).join('')}</div><div><small>${esc(u.name.split(' ')[0])}</small>${dnaThem.map((d) => `<span class="chip ${shared.includes(d) ? 'ai' : ''}">${esc(d)}</span>`).join('')}</div></div>
        ${shared.length ? `<p class="muted">You share ${shared.length} taste traits: ${shared.map(esc).join(', ')}.</p>` : ''}
      </div>
    </section>

    ${bothLoved.length ? row('You both loved', bothLoved.map((id) => card(BY_ID[id], { badge: `You ${m.ratings[id]}★ · ${esc(u.name.split(' ')[0])} ${theirs[id]}★` }))) : ''}

    ${disagreements.length ? `<section class="panel"><h3>Biggest disagreements</h3><div class="disagree">${disagreements.map(({ id, d }) => {
      const r = review(id), mine = m.reviews[id];
      return `<div class="dis-item"><a href="#/title/${id}">${poster(BY_ID[id], 'xs')}</a><div class="dis-body"><a href="#/title/${id}"><b>${esc(BY_ID[id].title)}</b></a>
        <div class="dis-scores"><span>You ${stars(m.ratings[id], 'sm')} <b>${m.ratings[id]}</b></span><span class="dis-gap ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${fmt1(d)}</span><span>${esc(u.name.split(' ')[0])} ${stars(theirs[id], 'sm')} <b>${theirs[id]}</b></span></div>
        <div class="dis-reviews">${mine ? `<p class="bubble me">“${esc(mine.text)}”</p>` : ''}${r ? `<p class="bubble">“${esc(r.text)}”</p>` : ''}</div></div></div>`;
    }).join('')}</div></section>` : ''}

    ${row(`Recommended from ${esc(u.name.split(' ')[0])}’s list`, fromThem.map((id) => card(BY_ID[id], { badge: `${esc(u.name.split(' ')[0])}: ${theirs[id]}★` })), { sub: 'Shows they rated 4★+ that you haven’t seen' })}
    ${row(`${esc(u.name.split(' ')[0])}’s Hearts`, Object.keys(theirLikes).map((id) => card(BY_ID[id])))}

    <section class="panel"><h3>Reviews by ${esc(u.name.split(' ')[0])}</h3>${reviews.slice(0, 10).map((r) => `<div class="feed-item"><a href="#/title/${r.titleId}">${poster(BY_ID[r.titleId], 'xs')}</a><div><a href="#/title/${r.titleId}"><b>${esc(BY_ID[r.titleId].title)}</b></a> ${stars(r.rating, 'sm')} ${m.ratings[r.titleId] ? `<span class="pill">You: ${m.ratings[r.titleId]}★</span>` : ''}<p>${esc(r.text)}</p><small class="muted">${timeAgo(r.date)} · ♥ ${r.likes}</small></div></div>`).join('')}</section>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const fb = e.target.closest('[data-follow]');
        if (fb) { store.toggleFollow(uid); import('../app.js').then((a) => a.refresh()); }
      });
    },
  };
}
