import * as store from '../store.js';
import { BY_ID, chartStats } from '../ai.js';
import { card, esc, icon, stars, timeAgo, poster } from '../ui.js';

const TABS = [['hearts', '❤ Hearts'], ['watchlist', 'Watchlist'], ['watching', 'Watching'], ['reviews', 'My reviews'], ['diary', 'Diary']];
let sort = 'recent';

export function myLists(tab = 'hearts') {
  const m = store.me();
  const stats = chartStats(m);
  let body = '';

  if (tab === 'hearts') {
    let ids = Object.keys(m.likes).filter((id) => BY_ID[id]).reverse();
    if (sort === 'rating') ids.sort((a, b) => (m.ratings[b] || 0) - (m.ratings[a] || 0));
    if (sort === 'community') ids.sort((a, b) => stats[b].avg - stats[a].avg);
    if (sort === 'az') ids.sort((a, b) => BY_ID[a].title.localeCompare(BY_ID[b].title));
    const anime = ids.filter((id) => BY_ID[id].kind === 'anime').length;
    body = ids.length ? `
      <div class="list-tools"><span class="muted">${ids.length} titles · ${ids.length - anime} series · ${anime} anime</span>
        <div class="seg sm">${[['recent', 'Recently added'], ['rating', 'My rating'], ['community', 'Community score'], ['az', 'A–Z']].map(([k, l]) => `<button data-sort="${k}" class="${sort === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="grid">${ids.map((id) => card(BY_ID[id], { avg: stats[id].avg })).join('')}</div>`
      : empty('No hearts yet', 'Tap the ❤ on any show you love and it lands here.');
  } else if (tab === 'watchlist') {
    body = m.watchlist.length ? `<div class="grid">${m.watchlist.filter((id) => BY_ID[id]).map((id) => card(BY_ID[id], { avg: stats[id].avg })).join('')}</div>` : empty('Your watchlist is empty', 'Add shows with the ＋ button to watch them later.');
  } else if (tab === 'watching') {
    const ids = Object.keys(m.status).filter((id) => m.status[id].state === 'watching' && BY_ID[id]);
    body = ids.length ? `<div class="progress-list">${ids.map((id) => {
      const t = BY_ID[id], ep = m.status[id].ep || 1;
      return `<a class="progress-item" href="#/title/${id}">${poster(t, 'xs')}<div><b>${esc(t.title)}</b><small>Episode ${ep} of ${t.episodes}</small><div class="meter"><div style="width:${(ep / t.episodes) * 100}%"></div></div></div></a>`;
    }).join('')}</div>` : empty('Nothing in progress', 'Set a show’s status to “Watching” to track episodes.');
  } else if (tab === 'reviews') {
    const ids = Object.keys(m.reviews).filter((id) => BY_ID[id]);
    body = ids.length ? ids.map((id) => `<a class="my-review" href="#/title/${id}">${poster(BY_ID[id], 'xs')}<div><b>${esc(BY_ID[id].title)}</b> ${stars(m.ratings[id] || 0, 'sm')}<p>${esc(m.reviews[id].text)}</p><small class="muted">${timeAgo(m.reviews[id].date)}</small></div></a>`).join('') : empty('No reviews yet', 'Open any show and write what you thought.');
  } else {
    const verbs = { rated: 'rated', liked: 'loved', watchlist: 'added to watchlist', reviewed: 'reviewed', joined: 'joined SeriesBox' };
    body = m.activity.length ? `<div class="diary">${m.activity.map((a) => `<div class="diary-item"><span class="diary-dot ${a.type}"></span><div>You ${verbs[a.type] || a.type} ${a.id && BY_ID[a.id] ? `<a href="#/title/${a.id}"><b>${esc(BY_ID[a.id].title)}</b></a>` : ''} ${a.rating ? stars(a.rating, 'sm') : ''}<small class="muted"> · ${timeAgo(a.date)}</small></div></div>`).join('')}</div>` : empty('Empty diary', 'Your activity will appear here.');
  }

  return {
    html: `<div class="page-head"><h1>My lists</h1><p class="muted">Everything you loved, plan to watch and wrote about.</p></div>
      <div class="tabs">${TABS.map(([k, l]) => `<a href="#/lists/${k}" class="${tab === k ? 'on' : ''}">${l}${k === 'hearts' ? ` <span class="count">${Object.keys(m.likes).length}</span>` : k === 'watchlist' ? ` <span class="count">${m.watchlist.length}</span>` : ''}</a>`).join('')}</div>
      <div class="list-body">${body}</div>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const s = e.target.closest('[data-sort]');
        if (s) { sort = s.dataset.sort; import('../app.js').then((a) => a.refresh()); }
      });
    },
  };
}

function empty(title, sub) {
  return `<div class="empty"><div class="empty-ic">${icon.heart(false)}</div><h2>${title}</h2><p class="muted">${sub}</p><a class="btn primary" href="#/">Discover shows</a></div>`;
}
