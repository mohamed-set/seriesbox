// Shared UI helpers and components (plain template strings).
import { BY_ID } from './ai.js';
import { USER_BY_ID } from './data/community.js';
import * as store from './store.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
export const years = (t) => (t.endYear ? `${t.year}–${t.endYear}` : `${t.year}–`);
export const kindLabel = (t) => (t.kind === 'anime' ? 'Anime' : 'Series');

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export const icon = {
  heart: (on) => `<svg viewBox="0 0 24 24" class="ic"><path fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3.1 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.6 0 5.8 3.7 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" class="ic"><path stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" class="ic"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  play: `<svg viewBox="0 0 24 24" class="ic"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 11v6M12 7.5v.1"/></svg>`,
  search: `<svg viewBox="0 0 24 24" class="ic"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M16.5 16.5L21 21"/></svg>`,
  star: `<svg viewBox="0 0 24 24" class="ic"><path fill="currentColor" d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" class="ic"><path fill="currentColor" d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/></svg>`,
  chev: (dir) => `<svg viewBox="0 0 24 24" class="ic"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="${dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`,
  up: `<svg viewBox="0 0 24 24" class="ic"><path fill="currentColor" d="M12 6l7 9H5z"/></svg>`,
  down: `<svg viewBox="0 0 24 24" class="ic"><path fill="currentColor" d="M12 18l7-9H5z"/></svg>`,
};

/** Poster box with gradient fallback (real art is painted by posters.js). */
export function poster(t, cls = '') {
  return `<div class="poster ${cls}" data-poster="${t.id}" style="--accent:${t.accent}">
    <div class="ph"><span class="ph-kind">${kindLabel(t)}</span><span class="ph-title">${esc(t.title)}</span><span class="ph-year">${t.year}</span></div>
  </div>`;
}

export function card(t, opts = {}) {
  const m = store.me();
  const liked = !!m.likes[t.id];
  const inList = m.watchlist.includes(t.id);
  const rating = m.ratings[t.id];
  const badge = opts.match ? `<span class="badge match">${opts.match}% match</span>` : opts.badge ? `<span class="badge">${opts.badge}</span>` : '';
  return `<a class="card ${opts.cls || ''}" href="#/title/${t.id}" data-id="${t.id}" title="${esc(t.title)}">
    ${poster(t)}
    ${badge}
    ${rating ? `<span class="my-rating">${icon.star}${rating}</span>` : ''}
    <div class="card-over">
      <div class="card-actions">
        <button class="ib like ${liked ? 'on' : ''}" data-act="like" data-id="${t.id}" aria-label="Like">${icon.heart(liked)}</button>
        <button class="ib ${inList ? 'on' : ''}" data-act="watchlist" data-id="${t.id}" aria-label="Watchlist">${inList ? icon.check : icon.plus}</button>
      </div>
      <div class="card-title">${esc(t.title)}</div>
      <div class="card-meta">${t.year} · ${kindLabel(t)}${opts.avg ? ` · <b class="gold">★ ${fmt1(opts.avg)}</b>` : ''}</div>
      ${opts.why && opts.why.length ? `<div class="card-why">${icon.spark} ${opts.why.map(esc).join(' · ')}</div>` : ''}
    </div>
  </a>`;
}

export function row(title, cards, opts = {}) {
  if (!cards.length) return '';
  return `<section class="row ${opts.cls || ''}">
    <div class="row-head"><h2>${title}</h2>${opts.sub ? `<span class="row-sub">${opts.sub}</span>` : ''}${opts.link ? `<a class="row-link" href="${opts.link}">See all ${icon.chev('r')}</a>` : ''}</div>
    <div class="scroller">
      <button class="sc-btn l" data-scroll="-1" aria-label="Scroll left">${icon.chev('l')}</button>
      <div class="track">${cards.join('')}</div>
      <button class="sc-btn r" data-scroll="1" aria-label="Scroll right">${icon.chev('r')}</button>
    </div>
  </section>`;
}

export function top10Row(title, ids) {
  return row(title, ids.slice(0, 10).map((id, i) => `<div class="top10-item"><span class="top10-num">${i + 1}</span>${card(BY_ID[id], { cls: 'small' })}</div>`), { cls: 'top10' });
}

/** Read-only stars (0-5, halves). */
export function stars(v, cls = '') {
  const pct = Math.max(0, Math.min(100, (v / 5) * 100));
  return `<span class="stars ${cls}" aria-label="${v} stars"><span class="stars-bg">★★★★★</span><span class="stars-fg" style="width:${pct}%">★★★★★</span></span>`;
}

/** Interactive half-star input. */
export function starInput(id, value = 0) {
  let html = `<div class="star-input" data-id="${id}" data-value="${value}" role="slider" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${value}">`;
  for (let i = 1; i <= 5; i++) {
    const full = value >= i, half = !full && value >= i - 0.5;
    html += `<span class="si ${full ? 'full' : half ? 'half' : ''}"><i data-v="${i - 0.5}"></i><i data-v="${i}"></i>★</span>`;
  }
  return html + `<span class="si-label">${value ? value.toFixed(1) : 'Rate'}</span></div>`;
}

export function avatar(u, size = 36) {
  if (!u) return '';
  const initials = u.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return `<span class="avatar" style="--c:${u.color};width:${size}px;height:${size}px;font-size:${size * 0.4}px">${esc(initials)}</span>`;
}

export const meUser = () => {
  const p = store.me().profile || { name: 'You', color: '#ff2e63' };
  return { id: 'me', name: p.name, handle: 'you', color: p.color };
};
export const userById = (id) => (id === 'me' ? meUser() : USER_BY_ID[id]);

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2400);
}

export function heartBurst(x, y) {
  for (let i = 0; i < 10; i++) {
    const h = document.createElement('span');
    h.className = 'burst';
    h.textContent = '❤';
    const a = (Math.PI * 2 * i) / 10;
    h.style.left = x + 'px'; h.style.top = y + 'px';
    h.style.setProperty('--dx', Math.cos(a) * (40 + Math.random() * 30) + 'px');
    h.style.setProperty('--dy', Math.sin(a) * (40 + Math.random() * 30) + 'px');
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 800);
  }
}

/** Ratings histogram (10 half-star buckets). */
export function histogram(hist, mine) {
  const max = Math.max(1, ...hist);
  return `<div class="histo">${hist.map((c, i) => `<div class="hb ${mine && Math.round(mine * 2) - 1 === i ? 'mine' : ''}" title="${(i + 1) / 2}★ · ${c} ratings"><div style="height:${Math.max(4, (c / max) * 100)}%"></div></div>`).join('')}</div>
    <div class="histo-axis"><span>½★</span><span>★★★★★</span></div>`;
}

/** Donut chart from [{label, value, color}]. */
export function donut(parts, size = 160) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  let acc = 0;
  const r = 15.9155;
  const segs = parts.map((p) => {
    const len = (p.value / total) * 100;
    const s = `<circle r="${r}" cx="21" cy="21" fill="none" stroke="${p.color}" stroke-width="6" stroke-dasharray="${len} ${100 - len}" stroke-dashoffset="${25 - acc}"><title>${esc(p.label)}: ${p.value}</title></circle>`;
    acc += len;
    return s;
  }).join('');
  return `<svg viewBox="0 0 42 42" width="${size}" height="${size}" class="donut"><circle r="${r}" cx="21" cy="21" fill="none" stroke="var(--line)" stroke-width="6"/>${segs}</svg>`;
}

export const PALETTE = ['#ff2e63', '#ff9a3c', '#8b5cf6', '#22d3ee', '#34d399', '#facc15', '#f472b6', '#60a5fa', '#a3e635', '#fb7185'];
