// The catalog. In the browser we load data/catalog.json, generated from live public APIs
// (TVmaze for series, AniList for anime) by scripts/update_catalog.mjs and refreshed weekly
// by a GitHub Action. If it is missing or the app runs offline, we fall back to the curated seed.
import { SEED } from './seed.js';

let titles = SEED;
let info = { source: 'Curated seed list', updated: null, live: false };

try {
  const injected = globalThis.__SERIESBOX_CATALOG__;
  const catalog = injected || (typeof window !== 'undefined'
    ? await fetch('data/catalog.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null))
    : null);
  if (catalog && Array.isArray(catalog.titles) && catalog.titles.length >= 50) {
    titles = catalog.titles;
    info = { source: catalog.source, updated: catalog.updated, live: true };
  }
} catch (e) { /* offline: keep the seed */ }

export const TITLES = titles;
export const CATALOG_INFO = info;
