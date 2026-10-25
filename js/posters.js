// Posters and banners are fetched at runtime from free public APIs (no key needed):
//   TVmaze (series) and AniList GraphQL (anime). Results are cached in localStorage.
// If the network is unavailable, a generated gradient poster is shown instead.
import { TITLES } from './data/titles.js';

const CACHE_KEY = 'seriesbox:art:v1';
let cache = {};
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { cache = {}; }
const persist = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* ignore */ } };

// Catalog entries built by scripts/update_catalog.mjs already carry poster/banner URLs.
for (const t of TITLES) if (t.poster && !cache[t.id]) cache[t.id] = { poster: t.poster, banner: t.banner || null };

export const art = (id) => cache[id] || null;

function apply(id) {
  const a = cache[id];
  if (!a) return;
  const set = (el, src) => {
    if (!src || el.dataset.src === src) return;
    el.dataset.src = src;
    el.style.backgroundImage = `url("${src}")`;
    el.classList.add('has-img');
  };
  document.querySelectorAll(`[data-poster="${id}"]`).forEach((el) => set(el, a.poster));
  document.querySelectorAll(`[data-banner="${id}"]`).forEach((el) => {
    set(el, a.banner || a.poster);
    el.classList.toggle('banner-from-poster', !a.banner);
  });
}

/** Call after each render: paints known art, nothing else. */
export function paint(root = document) {
  root.querySelectorAll('[data-poster],[data-banner]').forEach((el) => {
    const id = el.dataset.poster || el.dataset.banner;
    if (cache[id]) apply(id);
  });
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadAnime(list) {
  // One GraphQL request with aliases for up to 25 titles.
  for (let i = 0; i < list.length; i += 25) {
    const chunk = list.slice(i, i + 25);
    const q = chunk.map((t, j) => {
      const arg = t.anilistId ? `id: ${t.anilistId}` : `search: ${JSON.stringify(t.search || t.title)}`;
      return `a${j}: Media(${arg}, type: ANIME) { coverImage { extraLarge large color } bannerImage }`;
    }).join('\n');
    try {
      const { data } = await fetchJSON('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: `{ ${q} }` }),
      });
      chunk.forEach((t, j) => {
        const m = data && data[`a${j}`];
        if (m) {
          cache[t.id] = { poster: m.coverImage.extraLarge || m.coverImage.large, banner: m.bannerImage, color: m.coverImage.color };
          apply(t.id);
        }
      });
      persist();
    } catch (e) { /* offline or rate limited: keep gradients */ }
  }
}

async function loadSeries(t) {
  try {
    const show = t.tvmazeId
      ? await fetchJSON(`https://api.tvmaze.com/shows/${t.tvmazeId}`)
      : await fetchJSON(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(t.search || t.title)}`);
    cache[t.id] = { poster: show.image && (show.image.original || show.image.medium) };
    apply(t.id);
    const imgs = await fetchJSON(`https://api.tvmaze.com/shows/${show.id}/images`).catch(() => []);
    const bg = imgs.find((im) => im.type === 'background' && im.main) || imgs.find((im) => im.type === 'background');
    cache[t.id].banner = bg && bg.resolutions && (bg.resolutions.original || bg.resolutions.medium || {}).url;
    apply(t.id);
    persist();
  } catch (e) { /* ignore */ }
}

let started = false;
export async function loadAll() {
  if (started) return;
  started = true;
  const missing = TITLES.filter((t) => !cache[t.id]);
  loadAnime(missing.filter((t) => t.kind === 'anime'));
  // TVmaze allows ~20 calls / 10 s (2 calls per show): go 4 shows at a time with a short pause.
  const series = missing.filter((t) => t.kind === 'series');
  for (let i = 0; i < series.length; i += 4) {
    await Promise.all(series.slice(i, i + 4).map(loadSeries));
    await sleep(1300);
  }
}
