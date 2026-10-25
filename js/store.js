// Current user's state, persisted in localStorage (per browser).
const KEY = 'seriesbox:v1';

const EMPTY = () => ({
  profile: null, // {name, color}
  ratings: {}, likes: {}, watchlist: [],
  status: {}, // id -> {state: 'watching'|'completed'|'dropped', ep}
  reviews: {}, // id -> {text, rating, date, spoiler}
  reviewLikes: {}, following: [],
  tiers: { S: [], A: [], B: [], C: [], D: [] },
  activity: [],
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY(), ...JSON.parse(raw) };
  } catch (e) { /* storage blocked: run in memory */ }
  return EMPTY();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  listeners.forEach((fn) => fn(state));
}

export const me = () => state;
export const onChange = (fn) => listeners.add(fn);

function log(type, id, extra = {}) {
  state.activity.unshift({ type, id, date: new Date().toISOString(), ...extra });
  state.activity = state.activity.slice(0, 60);
}

export function setProfile(profile) { state.profile = profile; save(); }

export function rate(id, value) {
  if (!value) delete state.ratings[id];
  else { state.ratings[id] = value; log('rated', id, { rating: value }); }
  if (value && !state.status[id]) state.status[id] = { state: 'completed' };
  state.watchlist = state.watchlist.filter((x) => x !== id);
  save();
}

export function toggleLike(id) {
  if (state.likes[id]) delete state.likes[id];
  else { state.likes[id] = true; log('liked', id); }
  save();
  return !!state.likes[id];
}

export function toggleWatchlist(id) {
  const i = state.watchlist.indexOf(id);
  if (i >= 0) state.watchlist.splice(i, 1);
  else { state.watchlist.unshift(id); log('watchlist', id); }
  save();
  return i < 0;
}

export function setStatus(id, st) {
  if (!st) delete state.status[id]; else state.status[id] = { ...(state.status[id] || {}), ...st };
  save();
}

export function saveReview(id, text, spoiler) {
  if (!text.trim()) delete state.reviews[id];
  else { state.reviews[id] = { text: text.trim(), spoiler, date: new Date().toISOString() }; log('reviewed', id); }
  save();
}

export function toggleReviewLike(rid) {
  if (state.reviewLikes[rid]) delete state.reviewLikes[rid]; else state.reviewLikes[rid] = true;
  save();
}

export function toggleFollow(uid) {
  const i = state.following.indexOf(uid);
  if (i >= 0) state.following.splice(i, 1); else state.following.push(uid);
  save();
}

export function setTiers(tiers) { state.tiers = tiers; save(); }

export function seedProfile(profile, picks) {
  state = EMPTY();
  state.profile = profile;
  for (const id of picks) { state.likes[id] = true; state.ratings[id] = 5; state.status[id] = { state: 'completed' }; }
  log('joined', null);
  save();
}

export function reset() { state = EMPTY(); save(); }

export function exportJSON() { return JSON.stringify(state, null, 2); }
