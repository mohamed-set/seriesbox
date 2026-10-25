#!/usr/bin/env node
// Builds data/catalog.json from live public APIs (no API key needed):
//   - TVmaze (https://www.tvmaze.com/api) for TV series
//   - AniList GraphQL (https://anilist.co/graphiql) for anime
// The curated seed (js/data/seed.js) is kept and refreshed (status, episodes, posters);
// the most popular / trending titles from both APIs are added on top.
//
// Usage: node scripts/update_catalog.mjs [--series 160] [--anime 160]
// Run weekly by .github/workflows/update-catalog.yml.
import { writeFileSync, mkdirSync } from 'node:fs';
import { SEED } from '../js/data/seed.js';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : def; };
const MAX_SERIES = arg('series', 160);
const MAX_ANIME = arg('anime', 160);
const OUT = new URL('../data/catalog.json', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------- HTTP with rate limiting and retries ----------
let lastCall = 0;
async function getJSON(url, opts = {}, minGap = 520) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCall + minGap - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'SeriesBox student project', Accept: 'application/json', ...(opts.headers || {}) } });
      if (res.status === 404 && !opts.body) return null;
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get('retry-after')) || 2 ** attempt * 2;
        log(`  ${res.status} on ${url.slice(0, 70)}, retrying in ${ra}s`);
        await sleep(ra * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}: ${(await res.text()).slice(0, 300)}`);
      return await res.json();
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(2 ** attempt * 1000);
    }
  }
  return null;
}

// ---------- helpers ----------
const GENRES = ['Drama', 'Crime', 'Thriller', 'Comedy', 'Sci-Fi', 'Fantasy', 'Action', 'Adventure', 'Mystery', 'Horror', 'Romance', 'Historical', 'Animation', 'Sports', 'Slice of Life', 'Psychological', 'Supernatural', 'Mecha', 'Documentary', 'Family'];
const GENRE_MAP = { 'Science-Fiction': 'Sci-Fi', History: 'Historical', War: 'Historical', Western: 'Historical', Espionage: 'Thriller', Legal: 'Drama', Medical: 'Drama', Children: 'Family', Anime: 'Animation', Music: 'Drama', Food: 'Documentary', Nature: 'Documentary', Travel: 'Documentary' };
const mapGenres = (gs) => [...new Set(gs.map((g) => GENRE_MAP[g] || g).filter((g) => GENRES.includes(g)))];

const ANILIST_TAG_MAP = {
  Shounen: 'shonen', Seinen: 'seinen', Shoujo: 'shojo', Josei: 'josei', Isekai: 'isekai', 'Time Manipulation': 'time travel', 'Time Loop': 'time travel',
  Tragedy: 'tragedy', 'Super Power': 'superpowers', 'Found Family': 'found family', 'Coming of Age': 'coming of age', Revenge: 'revenge', Military: 'military', War: 'war',
  'Post-Apocalyptic': 'post-apocalyptic', Dystopian: 'dystopia', Cyberpunk: 'cyberpunk', Space: 'space', Demons: 'demons', Magic: 'magic', Survival: 'survival',
  Detective: 'detective', 'Serial Killer': 'serial killer', Conspiracy: 'conspiracy', Politics: 'political intrigue', 'School': 'high school', 'School Club': 'high school',
  'Martial Arts': 'martial arts', Samurai: 'samurai', Ninja: 'ninja', Pirates: 'pirates', 'Anti-Hero': 'anti-hero', 'Primarily Adult Cast': 'mature', Gore: 'gore',
  Philosophy: 'philosophy', 'Mafia': 'mafia', 'Iyashikei': 'wholesome', 'Cute Girls Doing Cute Things': 'wholesome', 'Love Triangle': 'romance', Parody: 'parody',
  Tournament: 'tournament', Swordplay: 'swords', Dragons: 'dragons', 'Artificial Intelligence': 'ai', Aliens: 'aliens', 'Mecha': 'mecha', Zombie: 'zombies',
  'Twins': 'family', 'Family Life': 'family drama', Football: 'football', Volleyball: 'volleyball', Band: 'band', Idol: 'idols', 'Death Game': 'game of death',
  'Psychological': 'psychological', Medieval: 'medieval', 'Urban Fantasy': 'urban fantasy', 'Reincarnation': 'reincarnation', 'Dungeon': 'dungeon', 'Heist': 'heist',
};
const ANILIST_TAG_SKIP = new Set(['Male Protagonist', 'Female Protagonist', 'Primarily Male Cast', 'Primarily Female Cast', 'Primarily Teen Cast', 'Ensemble Cast', 'Episodic', 'Adapted from manga', 'Full CGI', 'Nudity', 'Kuudere', 'Tsundere', 'Large Breasts', 'Ero Guro', 'Fan Service', 'Heterosexual', 'Ecchi']);

// Keywords in TVmaze summaries -> shared tag vocabulary (keeps content similarity meaningful).
const KEYWORDS = [
  [/detective|investigat|homicide|case/i, 'detective'], [/murder|killer|killing/i, 'murder'], [/serial killer/i, 'serial killer'], [/drug|cartel|meth|cocaine/i, 'drugs'],
  [/family|father|mother|sister|brother|sons?\b|daughter/i, 'family drama'], [/war\b|soldier|army|military/i, 'war'], [/high school|teen|student/i, 'teen'],
  [/zombie|undead/i, 'zombies'], [/space|planet|galaxy|starship/i, 'space'], [/time travel|timeline|past and future/i, 'time travel'], [/magic|wizard|witch|sorcer/i, 'magic'],
  [/king|queen|throne|kingdom|empire/i, 'political intrigue'], [/dragon/i, 'dragons'], [/heist|robbery|thie(f|ves)/i, 'heist'], [/police|cop\b|fbi|agent/i, 'crime'],
  [/lawyer|law firm|attorney/i, 'workplace'], [/doctor|hospital|surgeon/i, 'workplace'], [/office|company|coworker|employee/i, 'workplace'], [/friend/i, 'friendship'],
  [/love|romance|relationship/i, 'romance'], [/conspiracy|secret/i, 'conspiracy'], [/surviv/i, 'survival'], [/monster|creature/i, 'monsters'], [/superhero|powers/i, 'superpowers'],
  [/small town|village/i, 'small town'], [/revenge|vengeance/i, 'revenge'], [/spy|espionage|cia|mi6/i, 'spy'], [/mafia|mob\b|gang/i, 'mafia'], [/true story|real events|based on/i, 'true story'],
  [/dystop|totalitarian/i, 'dystopia'], [/apocalyp/i, 'post-apocalyptic'], [/ai\b|robot|android/i, 'ai'], [/hack/i, 'hacking'], [/vampire|demon|ghost|haunted/i, 'supernatural'],
  [/comedy|comedic|hilarious/i, 'comedy'], [/satir/i, 'satire'], [/coming[- ]of[- ]age/i, 'coming of age'], [/mystery|mysterious/i, 'mystery'], [/prison|inmate/i, 'prison'],
];

const strip = (html) => String(html || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\(Source:[^)]*\)/gi, '').replace(/\[Written by[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim();
function shortSynopsis(text, max = 340) {
  const s = strip(text);
  if (s.length <= max) return s;
  const sentences = s.match(/[^.!?]+[.!?]+/g) || [s];
  let out = '';
  for (const x of sentences) { if ((out + x).length > max) break; out += x; }
  return (out || s.slice(0, max - 1) + '…').trim();
}
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const PALETTE = ['#e63946', '#2a9d8f', '#e9c46a', '#8b5cf6', '#3a86ff', '#ff006e', '#fb5607', '#06d6a0', '#118ab2', '#ef476f'];
const colorFor = (s) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
const firstSentence = (s) => { const m = s.match(/^[^.!?]{12,90}[.!?]/); return m ? m[0] : ''; };

// ---------- AniList ----------
const AL_FIELDS = `id title { romaji english } format status episodes duration seasonYear startDate { year } endDate { year }
  genres tags { name rank isMediaSpoiler isGeneralSpoiler } description(asHtml: false) studios(isMain: true) { nodes { name } }
  averageScore popularity countryOfOrigin coverImage { extraLarge color } bannerImage nextAiringEpisode { episode airingAt }
  relations { edges { relationType node { type format } } }`;

async function anilist(query, variables = {}) {
  const res = await getJSON('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) }, 2200);
  if (!res || res.errors) throw new Error('AniList error: ' + JSON.stringify(res && res.errors).slice(0, 300));
  return res.data;
}

function seasonNow() {
  const d = new Date(), m = d.getUTCMonth();
  return { season: ['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'FALL', 'FALL', 'FALL', 'WINTER'][m], year: m === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear() };
}

function animeFromAniList(m) {
  const title = m.title.english || m.title.romaji;
  const tags = m.tags.filter((t) => t.rank >= 55 && !t.isMediaSpoiler && !t.isGeneralSpoiler && !ANILIST_TAG_SKIP.has(t.name))
    .map((t) => ANILIST_TAG_MAP[t.name] || t.name.toLowerCase()).slice(0, 9);
  const genres = mapGenres(m.genres);
  if (!genres.includes('Animation')) genres.push('Animation');
  const synopsis = shortSynopsis(m.description);
  return {
    id: slug(title), title, kind: 'anime', year: m.seasonYear || m.startDate.year, endYear: m.status === 'FINISHED' ? m.endDate.year || m.startDate.year : null,
    status: m.status === 'RELEASING' || m.status === 'NOT_YET_RELEASED' ? 'Ongoing' : 'Ended',
    seasons: 1, episodes: m.episodes || (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : 12), runtime: m.duration || 24,
    genres: genres.slice(0, 4), tags: [...new Set(tags)], synopsis, creator: (m.studios.nodes[0] || {}).name || 'Unknown studio', network: 'Japanese TV / streaming',
    country: m.countryOfOrigin || 'JP', popularity: 0, quality: m.averageScore ? m.averageScore / 10 : 7, accent: m.coverImage.color || colorFor(title),
    tagline: firstSentence(synopsis), search: m.title.romaji, anilistId: m.id, tvmazeId: null,
    poster: m.coverImage.extraLarge, banner: m.bannerImage, extScore: m.averageScore ? m.averageScore / 20 : null, extPopularity: m.popularity,
    nextEpisode: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, airsAt: new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() } : null,
    source: 'AniList',
  };
}

const isSequel = (m) => m.relations.edges.some((e) => e.relationType === 'PREQUEL' && e.node.type === 'ANIME' && ['TV', 'ONA', 'TV_SHORT'].includes(e.node.format));

async function fetchAnime() {
  const seedAnime = SEED.filter((t) => t.kind === 'anime');
  const byId = new Map();
  // 1) Refresh the seed, one title per request (a wrong id must not break the batch).
  for (const t of seedAnime) {
    try {
      const data = await anilist(`query ($id: Int, $s: String) { Media(id: $id, search: $s, type: ANIME) { ${AL_FIELDS} } }`, t.anilistId ? { id: t.anilistId } : { s: t.search || t.title });
      if (data.Media) byId.set(t.id, data.Media);
    } catch (e) { log(`  AniList miss for ${t.id}: ${e.message.slice(0, 120)}`); }
  }
  log(`AniList seed: ${byId.size}/${seedAnime.length}`);
  // 2) Popular all-time, trending now, and this season.
  const { season, year } = seasonNow();
  const lists = [];
  for (let page = 1; page <= 8; page++) lists.push(['popular', `Page(page: ${page}, perPage: 25) { media(type: ANIME, sort: POPULARITY_DESC, format_in: [TV, ONA], isAdult: false) { ${AL_FIELDS} } }`]);
  lists.push(['trending', `Page(page: 1, perPage: 25) { media(type: ANIME, sort: TRENDING_DESC, format_in: [TV, ONA], isAdult: false) { ${AL_FIELDS} } }`]);
  lists.push(['season', `Page(page: 1, perPage: 25) { media(type: ANIME, season: ${season}, seasonYear: ${year}, sort: POPULARITY_DESC, format_in: [TV, ONA], isAdult: false) { ${AL_FIELDS} } }`]);
  const extra = [];
  for (const [name, q] of lists) {
    let data;
    try { data = await anilist(`{ ${q} }`); } catch (e) { log(`  AniList ${name} failed: ${e.message.slice(0, 200)}`); continue; }
    data.Page.media.forEach((m) => extra.push({ m, from: name }));
    log(`AniList ${name}: ${data.Page.media.length}`);
  }
  return { seed: byId, extra };
}

// ---------- TVmaze ----------
function seriesFromTVmaze(s, seasons, images) {
  const bg = (images || []).find((im) => im.type === 'background' && im.main) || (images || []).find((im) => im.type === 'background');
  const synopsis = shortSynopsis(s.summary);
  const tags = new Set();
  for (const [re, tag] of KEYWORDS) if (re.test(s.summary || '')) tags.add(tag);
  s.genres.forEach((g) => tags.add(g.toLowerCase()));
  if (s.type === 'Animation') tags.add('adult animation');
  const genres = mapGenres(s.genres);
  if (s.type === 'Animation' && !genres.includes('Animation')) genres.push('Animation');
  if (!genres.length) genres.push('Drama');
  const net = s.network || s.webChannel || {};
  const eps = (seasons || []).reduce((a, x) => a + (x.episodeOrder || 0), 0);
  return {
    id: slug(s.name), title: s.name, kind: 'series', year: Number((s.premiered || '2000').slice(0, 4)), endYear: s.ended ? Number(s.ended.slice(0, 4)) : null,
    status: s.status === 'Ended' ? 'Ended' : 'Ongoing', seasons: (seasons || []).length || 1, episodes: eps || 10, runtime: s.averageRuntime || s.runtime || 45,
    genres: genres.slice(0, 4), tags: [...tags].slice(0, 9), synopsis, creator: net.name || 'Unknown', network: net.name || 'Unknown',
    country: (net.country && net.country.code) || (s.webChannel && s.webChannel.country && s.webChannel.country.code) || 'US',
    popularity: s.weight || 50, quality: s.rating && s.rating.average ? s.rating.average : 7, accent: colorFor(s.name), tagline: firstSentence(synopsis),
    search: s.name, anilistId: null, tvmazeId: s.id,
    poster: s.image && (s.image.original || s.image.medium), banner: bg && bg.resolutions && (bg.resolutions.original || bg.resolutions.medium || {}).url,
    extScore: s.rating && s.rating.average ? s.rating.average / 2 : null, nextEpisode: null, source: 'TVmaze',
  };
}

async function fetchSeries() {
  const seedSeries = SEED.filter((t) => t.kind === 'series');
  const shows = new Map(); // seed id -> show
  for (const t of seedSeries) {
    const s = t.tvmazeId ? await getJSON(`https://api.tvmaze.com/shows/${t.tvmazeId}`) : await getJSON(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(t.search || t.title)}`);
    if (s) shows.set(t.id, s);
  }
  log(`TVmaze seed: ${shows.size}/${seedSeries.length}`);
  // Full index scan (250 shows per page), keep popular, well-rated scripted shows.
  const candidates = [];
  for (let page = 0; page < 400; page++) {
    const list = await getJSON(`https://api.tvmaze.com/shows?page=${page}`);
    if (!list || !list.length) break;
    for (const s of list) {
      const rating = s.rating && s.rating.average;
      if ((s.weight || 0) >= 90 && rating >= 7.2 && ['Scripted', 'Animation'].includes(s.type) && s.premiered && Number(s.premiered.slice(0, 4)) >= 1990 && s.image && !s.genres.includes('Children')) candidates.push(s);
    }
    if (page % 25 === 0) log(`TVmaze index page ${page}, ${candidates.length} candidates`);
  }
  // Rank: popularity weight first, then rating; recent shows get a small boost so the catalog stays current.
  const score = (s) => s.weight * 1 + s.rating.average * 3 + (Number(s.premiered.slice(0, 4)) >= new Date().getUTCFullYear() - 2 ? 8 : 0);
  candidates.sort((a, b) => score(b) - score(a));
  return { seed: shows, extra: candidates };
}

async function details(show) {
  const [seasons, images] = await Promise.all([
    getJSON(`https://api.tvmaze.com/shows/${show.id}/seasons`),
    getJSON(`https://api.tvmaze.com/shows/${show.id}/images`),
  ]);
  return { seasons: (seasons || []).filter((x) => x.premiereDate), images };
}

// ---------- main ----------
async function main() {
  const out = [];
  const used = new Set();
  const addId = (t) => { let id = t.id || slug(t.title); if (used.has(id)) id = `${id}-${t.year}`; used.add(id); t.id = id; out.push(t); };

  const anime = await fetchAnime();
  const series = await fetchSeries();

  // Seed entries: keep curated fields (tags, synopsis, tagline, creator...), refresh live fields.
  for (const t of SEED) {
    const live = { ...t };
    if (t.kind === 'anime' && anime.seed.has(t.id)) {
      const a = animeFromAniList(anime.seed.get(t.id));
      Object.assign(live, { anilistId: a.anilistId, status: a.status, endYear: a.endYear ?? t.endYear, poster: a.poster, banner: a.banner, extScore: a.extScore, nextEpisode: a.nextEpisode, accent: t.accent, source: 'AniList' });
      if (a.status === 'Ongoing') live.endYear = null;
    }
    if (t.kind === 'series' && series.seed.has(t.id)) {
      const s = series.seed.get(t.id);
      const { seasons, images } = await details(s);
      const a = seriesFromTVmaze(s, seasons, images);
      Object.assign(live, { tvmazeId: s.id, status: a.status, endYear: a.endYear, seasons: Math.max(a.seasons, 1), episodes: a.episodes > 1 ? a.episodes : t.episodes, poster: a.poster, banner: a.banner, extScore: a.extScore, source: 'TVmaze' });
    }
    addId(live);
  }
  const seenAniList = new Set(out.map((t) => t.anilistId).filter(Boolean));
  const seenTVmaze = new Set(out.map((t) => t.tvmazeId).filter(Boolean));

  // New anime: skip sequels and anything already in the catalog.
  const maxPop = Math.max(...anime.extra.map((x) => x.m.popularity));
  let addedAnime = 0;
  for (const { m } of anime.extra) {
    if (addedAnime >= MAX_ANIME - SEED.filter((t) => t.kind === 'anime').length) break;
    if (seenAniList.has(m.id) || isSequel(m) || !m.description || m.countryOfOrigin !== 'JP') continue;
    seenAniList.add(m.id);
    const a = animeFromAniList(m);
    a.popularity = Math.round(30 + 70 * (Math.log(m.popularity + 1) / Math.log(maxPop + 1)) ** 3);
    if (a.tags.length < 3) continue;
    addId(a); addedAnime++;
  }
  log(`Anime added: ${addedAnime}`);

  let addedSeries = 0;
  for (const s of series.extra) {
    if (addedSeries >= MAX_SERIES - SEED.filter((t) => t.kind === 'series').length) break;
    if (seenTVmaze.has(s.id) || !s.summary) continue;
    seenTVmaze.add(s.id);
    const { seasons, images } = await details(s);
    const t = seriesFromTVmaze(s, seasons, images);
    // TVmaze "weight" saturates near 100 for popular shows: use the rank instead.
    t.popularity = Math.round(88 - (50 * addedSeries) / Math.max(1, MAX_SERIES));
    addId(t);
    addedSeries++;
    if (addedSeries % 20 === 0) log(`Series details ${addedSeries}`);
  }
  log(`Series added: ${addedSeries}`);

  const catalog = {
    updated: new Date().toISOString(),
    source: 'TVmaze + AniList (live APIs)',
    counts: { total: out.length, series: out.filter((t) => t.kind === 'series').length, anime: out.filter((t) => t.kind === 'anime').length },
    titles: out,
  };
  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  writeFileSync(OUT, JSON.stringify(catalog));
  log(`Wrote ${out.length} titles (${catalog.counts.series} series, ${catalog.counts.anime} anime) to data/catalog.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
