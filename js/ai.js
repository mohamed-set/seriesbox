// SeriesBox recommendation engine, 100% in the browser.
//  1. Content-based: TF-IDF vectors over genres, tags, creator/studio and synopsis words, cosine similarity.
//  2. Collaborative filtering: user-user k-NN on mean-centred ratings (with significance shrinkage),
//     plus item-item "fans also loved" from co-likes.
//  3. Hybrid: blends both, weighted by how much we know about the user (cold start -> content).
import { TITLES } from './data/titles.js';
import { COMMUNITY } from './data/community.js';

const STOP = new Set('a an the and or of to in on for with his her their its into from by as is are be at that this who whom while when where after before about over under than then them they he she it we you your our one two new his own must every each more most all any can not only also but if out up down through between becomes become life world story series show his'.split(' '));

export const BY_ID = Object.fromEntries(TITLES.map((t) => [t.id, t]));

const FIELD_WEIGHT = { g: 2.2, t: 1.6, c: 1.2, w: 0.45, k: 0.6, d: 0.4 };
export const FEATURE_LABEL = (f) => f.slice(2);

function features(t) {
  const out = {};
  const add = (k, w) => (out[k] = (out[k] || 0) + w);
  t.genres.forEach((g) => add('g:' + g, 1));
  t.tags.forEach((g) => add('t:' + g, 1));
  t.creator.split(/,\s*/).forEach((c) => add('c:' + c, 1));
  add('k:' + t.kind, 1);
  add('d:' + Math.floor(t.year / 10) * 10 + 's', 1);
  t.synopsis.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => add('w:' + w, 1));
  return out;
}

// ---- TF-IDF ----
const RAW = TITLES.map(features);
const DF = {};
RAW.forEach((f) => Object.keys(f).forEach((k) => (DF[k] = (DF[k] || 0) + 1)));
const N = TITLES.length;
export const IDF = Object.fromEntries(Object.entries(DF).map(([k, d]) => [k, Math.log((N + 1) / (d + 1)) + 1]));

function normalize(v) {
  let n = 0;
  for (const k in v) n += v[k] * v[k];
  n = Math.sqrt(n) || 1;
  for (const k in v) v[k] /= n;
  return v;
}
export const VEC = {};
TITLES.forEach((t, i) => {
  const v = {};
  for (const [k, tf] of Object.entries(RAW[i])) v[k] = (1 + Math.log(tf)) * IDF[k] * FIELD_WEIGHT[k[0]];
  VEC[t.id] = normalize(v);
});

// Vectors are never mutated after creation, so their sizes can be cached.
const SIZE = new WeakMap();
const size = (o) => {
  let n = SIZE.get(o);
  if (n === undefined) { n = 0; for (const k in o) n++; SIZE.set(o, n); }
  return n;
};
export function cosine(a, b) {
  let s = 0;
  const [x, y] = size(a) < size(b) ? [a, b] : [b, a];
  for (const k in x) if (y[k]) s += x[k] * y[k];
  return s;
}

const SIM = {};
for (const a of TITLES) {
  SIM[a.id] = {};
  for (const b of TITLES) if (a.id !== b.id) SIM[a.id][b.id] = cosine(VEC[a.id], VEC[b.id]);
}

/** Top shared features between two titles, by contribution to their similarity. */
export function explain(aId, bId, n = 3) {
  const a = VEC[aId], b = VEC[bId];
  return Object.keys(a).filter((k) => b[k] && k[0] !== 'w' && k[0] !== 'd')
    .map((k) => [k, a[k] * b[k]]).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k]) => FEATURE_LABEL(k));
}

// Similarity is shown as a "match %": rescale cosine to a friendly 55-99 range.
export const matchPct = (s) => Math.round(Math.max(40, Math.min(99, 45 + s * 95)));

export function similar(id, n = 12, filterKind = null) {
  return Object.entries(SIM[id]).filter(([o]) => !filterKind || BY_ID[o].kind === filterKind)
    .sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([o, s]) => ({ id: o, score: s, match: matchPct(s), why: explain(id, o) }));
}

// ---- Community helpers ----
/** All ratings, community + current user (under id "me"). */
export function allRatings(me) {
  return { ...COMMUNITY.ratings, me: me.ratings };
}
export function allLikes(me) {
  return { ...COMMUNITY.likes, me: me.likes };
}

const MEANS = new WeakMap();
const mean = (o) => {
  if (MEANS.has(o)) return MEANS.get(o);
  const v = Object.values(o);
  const m = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 3.5;
  if (Object.isFrozen(o) || COMMUNITY_SETS.has(o)) MEANS.set(o, m);
  return m;
};
const COMMUNITY_SETS = new Set(Object.values(COMMUNITY.ratings));

/** Taste compatibility between two rating maps: shrunk Pearson-like cosine on centred ratings, mapped to 0-100. */
export function compatibility(ra, rb) {
  const common = Object.keys(ra).filter((k) => k in rb);
  if (common.length < 2) return { score: null, common };
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (const k of common) {
    const x = ra[k] - ma, y = rb[k] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  let pearson = da && db ? num / Math.sqrt(da * db) : 0;
  // Agreement on absolute ratings also counts (people who both give 5s).
  const absAgree = 1 - common.reduce((s, k) => s + Math.abs(ra[k] - rb[k]), 0) / common.length / 4.5;
  const shrink = common.length / (common.length + 4);
  const sim = (0.55 * pearson + 0.45 * (absAgree * 2 - 1)) * shrink;
  return { score: Math.round(Math.max(0, Math.min(100, 50 + sim * 55))), sim, common };
}

/** Users most similar to a rating map. */
export function neighbours(myRatings, excludeId = 'me', k = 36) {
  return COMMUNITY.users.filter((u) => u.id !== excludeId)
    .map((u) => ({ user: u, ...compatibility(myRatings, COMMUNITY.ratings[u.id]) }))
    .filter((x) => x.score !== null).sort((a, b) => b.sim - a.sim).slice(0, k);
}

/** User-user CF predicted rating for each unseen title. */
export function cfPredict(myRatings, excludeId = 'me', k = 12) {
  const nb = neighbours(myRatings, excludeId).filter((x) => x.sim > 0).slice(0, k);
  const mu = mean(myRatings);
  const out = {};
  for (const t of TITLES) {
    if (t.id in myRatings) continue;
    let num = 0, den = 0, n = 0;
    for (const { user, sim } of nb) {
      const r = COMMUNITY.ratings[user.id][t.id];
      if (r === undefined) continue;
      num += sim * (r - mean(COMMUNITY.ratings[user.id]));
      den += Math.abs(sim); n++;
    }
    if (n) out[t.id] = { pred: Math.max(0.5, Math.min(5, mu + num / den)), support: n };
  }
  return out;
}

/** Taste profile: weighted sum of title vectors (liked titles and high ratings count positive, low ratings negative). */
export function tasteProfile(me) {
  const v = {};
  const mu = Object.keys(me.ratings).length ? mean(me.ratings) : 3;
  const ids = new Set([...Object.keys(me.ratings), ...Object.keys(me.likes)]);
  for (const id of ids) {
    if (!VEC[id]) continue;
    let w = me.ratings[id] !== undefined ? (me.ratings[id] - mu) * 0.8 + 0.4 : 0.6;
    if (me.likes[id]) w += 1;
    for (const k in VEC[id]) v[k] = (v[k] || 0) + w * VEC[id][k];
  }
  for (const k in v) if (v[k] <= 0) delete v[k];
  return normalize(v);
}

/** Top features of the profile for the "Taste DNA" view. */
export function tasteDNA(me, n = 8) {
  const p = tasteProfile(me);
  return Object.entries(p).filter(([k]) => k[0] === 't' || k[0] === 'g')
    .sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, w]) => ({ label: FEATURE_LABEL(k), weight: w, kind: k[0] }));
}

/** Popularity baseline: Bayesian weighted rating (IMDb formula) using community + me. */
export function chartStats(me) {
  const R = allRatings(me), L = allLikes(me);
  const stats = {};
  for (const t of TITLES) stats[t.id] = { id: t.id, sum: 0, n: 0, likes: 0, hist: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sq: 0 };
  for (const [u, rs] of Object.entries(R)) for (const [id, r] of Object.entries(rs)) {
    const s = stats[id]; if (!s) continue;
    s.sum += r; s.sq += r * r; s.n++; s.hist[Math.round(r * 2) - 1]++;
    if (L[u] && L[u][id]) s.likes++;
  }
  const all = Object.values(stats).filter((s) => s.n);
  const C = all.reduce((a, s) => a + s.sum, 0) / all.reduce((a, s) => a + s.n, 0);
  const m = 6;
  for (const s of Object.values(stats)) {
    s.avg = s.n ? s.sum / s.n : 0;
    s.weighted = (s.n / (s.n + m)) * s.avg + (m / (s.n + m)) * C;
    s.std = s.n > 1 ? Math.sqrt(Math.max(0, s.sq / s.n - s.avg * s.avg)) : 0;
    // "Buzz": recent review activity.
  }
  const now = new Date('2026-10-25T12:00:00Z');
  for (const rv of COMMUNITY.reviews) {
    const age = (now - new Date(rv.date)) / 864e5;
    if (stats[rv.titleId]) stats[rv.titleId].buzz = (stats[rv.titleId].buzz || 0) + Math.exp(-age / 30) * (1 + rv.likes / 300);
  }
  for (const s of Object.values(stats)) s.buzz = (s.buzz || 0) + BY_ID[s.id].popularity / 60;
  return stats;
}

/** Hybrid recommendations for the current user. */
export function recommend(me, n = 20, opts = {}) {
  const seen = new Set([...Object.keys(me.ratings), ...Object.keys(me.likes), ...(opts.excludeWatchlist ? me.watchlist : [])]);
  const known = Object.keys(me.ratings).length + Object.keys(me.likes).length;
  const profile = tasteProfile(me);
  const cf = known >= 3 ? cfPredict({ ...me.ratings, ...Object.fromEntries(Object.keys(me.likes).filter((k) => !(k in me.ratings)).map((k) => [k, 4.5])) }) : {};
  const stats = opts.stats || chartStats(me);
  // Cold start: rely on content; with more ratings, trust the crowd more.
  const alpha = known < 3 ? 1 : Math.max(0.45, 0.85 - known * 0.02);
  const res = [];
  for (const t of TITLES) {
    if (seen.has(t.id)) continue;
    const c = Object.keys(profile).length ? cosine(profile, VEC[t.id]) : 0;
    const cfp = cf[t.id] ? (cf[t.id].pred - 2.5) / 2.5 : 0;
    const quality = (stats[t.id].weighted - 3) / 2;
    const score = alpha * c * 1.6 + (1 - alpha) * cfp * 0.6 + 0.15 * quality;
    // Explain with the closest title the user loves.
    let because = null, best = 0;
    for (const id of Object.keys(me.likes).concat(Object.keys(me.ratings).filter((k) => me.ratings[k] >= 4))) {
      const s = SIM[t.id][id] || 0;
      if (s > best) { best = s; because = id; }
    }
    res.push({ id: t.id, score, content: c, cf: cf[t.id] || null, because, why: because ? explain(because, t.id, 2) : [] });
  }
  res.sort((a, b) => b.score - a.score);
  const top = res[0]?.score || 1;
  return res.slice(0, n).map((r) => ({ ...r, match: Math.round(Math.max(55, Math.min(99, 60 + (r.score / top) * 38))) }));
}

/** Item-item: titles most co-liked with this one ("Fans also loved"). Jaccard on likers. */
export function fansAlsoLoved(id, me, n = 10) {
  const L = allLikes(me);
  const likers = Object.keys(L).filter((u) => L[u][id]);
  if (!likers.length) return [];
  const counts = {};
  for (const u of likers) for (const o of Object.keys(L[u])) if (o !== id) counts[o] = (counts[o] || 0) + 1;
  const likersOf = (o) => Object.keys(L).filter((u) => L[u][o]).length;
  return Object.entries(counts).map(([o, c]) => ({ id: o, score: c / (likers.length + likersOf(o) - c), fans: c }))
    .sort((a, b) => b.score - a.score).slice(0, n);
}

/** Mood picker: mood keywords become a pseudo-profile, blended with the user's taste. */
export const MOODS = {
  'Mind-bending': { emoji: '🌀', tags: ['plot twists', 'time travel', 'mind games', 'psychological', 'conspiracy', 'Mystery', 'philosophy'] },
  'Adrenaline': { emoji: '⚡', tags: ['Action', 'superpowers', 'survival', 'shonen', 'martial arts', 'tournament', 'war'] },
  'Laugh out loud': { emoji: '😂', tags: ['Comedy', 'sitcom', 'feel-good', 'parody', 'mockumentary', 'satire', 'workplace'] },
  'Good cry': { emoji: '😭', tags: ['tearjerker', 'grief', 'tragedy', 'healing', 'coming of age', 'music', 'Romance'] },
  'Dark & gritty': { emoji: '🖤', tags: ['dark', 'Crime', 'anti-hero', 'drugs', 'serial killer', 'violence', 'gore'] },
  'Cozy night': { emoji: '☕', tags: ['wholesome', 'slice of life', 'found family', 'feel-good', 'friendship', 'romance', 'Slice of Life'] },
  'Epic worlds': { emoji: '🐉', tags: ['Fantasy', 'magic', 'dragons', 'medieval', 'political intrigue', 'Adventure', 'space'] },
};
export const TIME_BUDGET = {
  'A quick episode': (t) => t.runtime <= 30,
  'A weekend binge': (t) => t.episodes <= 40,
  'A long journey': (t) => t.episodes > 40,
  'Anything': () => true,
};

export function moodPick(me, mood, budget, kind = 'all', n = 3) {
  const v = {};
  for (const tag of MOODS[mood].tags) {
    const k = (/^[A-Z]/.test(tag) ? 'g:' : 't:') + tag;
    if (IDF[k]) v[k] = IDF[k];
  }
  normalize(v);
  const profile = tasteProfile(me);
  const hasProfile = Object.keys(profile).length > 0;
  const stats = chartStats(me);
  return TITLES.filter((t) => TIME_BUDGET[budget](t) && (kind === 'all' || t.kind === kind) && !(t.id in me.ratings))
    .map((t) => {
      const moodFit = cosine(v, VEC[t.id]);
      const taste = hasProfile ? cosine(profile, VEC[t.id]) : 0;
      return { id: t.id, score: moodFit * 1.2 + taste * 0.6 + (stats[t.id].weighted - 3) * 0.08, moodFit, taste };
    })
    .sort((a, b) => b.score - a.score).slice(0, n);
}

/** Offline evaluation: leave-one-out on the community. Hide one loved title per user and check if it is in the top-K. */
export function evaluate(K = 10) {
  const methods = { 'Popularity': 0, 'Content-based': 0, 'Collaborative': 0, 'Hybrid (SeriesBox)': 0 };
  let trials = 0;
  const popularity = Object.fromEntries(TITLES.map((t) => [t.id, Object.values(COMMUNITY.ratings).filter((r) => r[t.id] !== undefined).length]));
  for (const u of COMMUNITY.users) {
    const r = COMMUNITY.ratings[u.id];
    const loved = Object.keys(r).filter((k) => r[k] >= 4.5).sort();
    for (const hidden of loved.filter((_, i) => i % 3 === 0)) {
      trials++;
      const train = { ...r }; delete train[hidden];
      const likes = Object.fromEntries(Object.keys(COMMUNITY.likes[u.id]).filter((k) => k !== hidden).map((k) => [k, true]));
      const me = { ratings: train, likes, watchlist: [] };
      const cand = TITLES.filter((t) => !(t.id in train)).map((t) => t.id);
      const rank = (scoreFn) => cand.map((id) => [id, scoreFn(id)]).sort((a, b) => b[1] - a[1]).slice(0, K).some(([id]) => id === hidden);
      const prof = tasteProfile(me);
      const cf = cfPredict(train, u.id);
      if (rank((id) => popularity[id])) methods['Popularity']++;
      if (rank((id) => cosine(prof, VEC[id]))) methods['Content-based']++;
      if (rank((id) => (cf[id] ? cf[id].pred : 0))) methods['Collaborative']++;
      if (rank((id) => 0.6 * cosine(prof, VEC[id]) * 1.6 + 0.4 * (cf[id] ? (cf[id].pred - 2.5) / 2.5 : 0) * 0.6 + popularity[id] / 300)) methods['Hybrid (SeriesBox)']++;
    }
  }
  return { trials, K, results: Object.entries(methods).map(([name, hits]) => ({ name, hitRate: hits / trials })) };
}

export const VOCAB_SIZE = Object.keys(IDF).length;
