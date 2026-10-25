import { TITLES, CATALOG_INFO } from '../data/titles.js';
import { COMMUNITY } from '../data/community.js';
import * as store from '../store.js';
import { recommend, similar, chartStats, neighbours, BY_ID } from '../ai.js';
import { card, row, top10Row, esc, icon, fmt1, years, kindLabel, avatar, stars, timeAgo, userById } from '../ui.js';

export function home() {
  const m = store.me();
  const stats = chartStats(m);
  const recs = recommend(m, 24, { stats });
  const hero = recs[0] ? BY_ID[recs[0].id] : TITLES[0];
  const heroRec = recs[0];
  const avg = (id) => stats[id].avg;
  const seen = (id) => id in m.ratings || m.likes[id];

  const rows = [];

  const watching = Object.entries(m.status).filter(([, s]) => s.state === 'watching').map(([id]) => BY_ID[id]);
  if (watching.length) rows.push(row('Continue watching', watching.map((t) => card(t, { badge: `Ep ${m.status[t.id].ep || 1}/${t.episodes}` }))));

  rows.push(row(`Top picks for ${esc(m.profile.name)}`, recs.slice(1, 21).map((r) => card(BY_ID[r.id], { match: r.match, why: r.why, avg: avg(r.id) })), { sub: `${icon.spark} AI hybrid recommender`, cls: 'ai-row' }));

  const recentLoves = Object.keys(m.likes).reverse().slice(0, 2);
  for (const id of recentLoves) {
    const sims = similar(id, 14).filter((s) => !seen(s.id));
    rows.push(row(`Because you loved <em>${esc(BY_ID[id].title)}</em>`, sims.map((s) => card(BY_ID[s.id], { match: s.match, why: s.why }))));
  }

  // Live data from the weekly catalog refresh: shows with an upcoming episode.
  const now = Date.now();
  const airing = TITLES.filter((t) => t.nextEpisode && new Date(t.nextEpisode.airsAt) > now - 864e5)
    .sort((a, b) => new Date(a.nextEpisode.airsAt) - new Date(b.nextEpisode.airsAt));
  const inDays = (iso) => { const d = Math.round((new Date(iso) - now) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`; };
  if (airing.length) rows.push(row('New episodes this week', airing.map((t) => card(t, { badge: `Ep ${t.nextEpisode.episode} · ${inDays(t.nextEpisode.airsAt)}` })), { sub: `<span class="live-dot"></span> Live from AniList${CATALOG_INFO.updated ? ` · updated ${new Date(CATALOG_INFO.updated).toLocaleDateString()}` : ''}` }));
  else {
    const ongoing = TITLES.filter((t) => t.status === 'Ongoing').sort((a, b) => b.popularity - a.popularity);
    rows.push(row('Currently airing', ongoing.map((t) => card(t, { badge: 'On air' }))));
  }

  const byBuzz = (kind) => TITLES.filter((t) => t.kind === kind).sort((a, b) => stats[b.id].buzz - stats[a.id].buzz).map((t) => t.id);
  rows.push(top10Row('Top 10 series this week', byBuzz('series')));

  const twin = neighbours(m.ratings)[0];
  if (twin) {
    const tr = COMMUNITY.ratings[twin.user.id];
    const picks = Object.keys(tr).filter((id) => tr[id] >= 4 && !seen(id)).sort((a, b) => tr[b] - tr[a]);
    rows.push(row(`<a href="#/user/${twin.user.id}" class="inline-user">${avatar(twin.user, 26)} ${esc(twin.user.name.split(' ')[0])}</a>, your taste twin, loved`, picks.map((id) => card(BY_ID[id], { badge: `★ ${tr[id]}` })), { sub: `${twin.score}% taste match` }));
  }

  rows.push(top10Row('Top 10 anime this week', byBuzz('anime')));

  const gems = TITLES.filter((t) => t.popularity < 70 && stats[t.id].weighted >= 3.6 && !seen(t.id)).sort((a, b) => stats[b.id].weighted - stats[a.id].weighted);
  rows.push(row('Hidden gems', gems.map((t) => card(t, { avg: avg(t.id), badge: 'Gem' })), { sub: 'High ratings, low hype' }));

  const fresh = COMMUNITY.reviews.filter((r) => r.text.length > 40).slice(0, 14);
  rows.push(`<section class="row"><div class="row-head"><h2>Fresh from the community</h2><a class="row-link" href="#/community">See all ${icon.chev('r')}</a></div>
    <div class="scroller"><div class="track">${fresh.map((r) => {
      const u = userById(r.userId), t = BY_ID[r.titleId];
      return `<a class="mini-review" href="#/title/${t.id}"><div class="mr-top">${avatar(u, 28)}<b>${esc(u.name)}</b>${stars(r.rating, 'sm')}</div><div class="mr-title">${esc(t.title)}</div><p>“${esc(r.text)}”</p><small>${timeAgo(r.date)} · ♥ ${r.likes}</small></a>`;
    }).join('')}</div></div></section>`);

  const acclaimed = TITLES.filter((t) => !seen(t.id)).sort((a, b) => stats[b.id].weighted - stats[a.id].weighted);
  rows.push(row('Critically acclaimed', acclaimed.map((t) => card(t, { avg: avg(t.id) })), { link: '#/charts' }));

  const heroLiked = !!m.likes[hero.id], heroList = m.watchlist.includes(hero.id);
  return {
    html: `
    <section class="hero">
      <div class="hero-bg" data-banner="${hero.id}" style="--accent:${hero.accent}"></div>
      <div class="hero-shade"></div>
      <div class="hero-content">
        <div class="hero-kicker">${icon.spark} #1 pick for you · <b>${heroRec ? heroRec.match : 98}% match</b></div>
        <h1 class="hero-title">${esc(hero.title)}</h1>
        <div class="hero-meta"><span class="gold">★ ${fmt1(avg(hero.id))}</span><span>${years(hero)}</span><span>${kindLabel(hero)}</span><span>${hero.seasons} season${hero.seasons > 1 ? 's' : ''}</span><span>${hero.genres.join(' · ')}</span></div>
        <p class="hero-syn">${esc(hero.synopsis)}</p>
        ${heroRec && heroRec.because ? `<p class="hero-why">Because you loved <b>${esc(BY_ID[heroRec.because].title)}</b>${heroRec.why.length ? ` · shared DNA: ${heroRec.why.map(esc).join(', ')}` : ''}</p>` : ''}
        <div class="hero-btns">
          <a class="btn primary" href="#/title/${hero.id}">${icon.info} Details</a>
          <button class="btn glass ${heroLiked ? 'liked' : ''}" data-act="like" data-id="${hero.id}">${icon.heart(heroLiked)} ${heroLiked ? 'Loved' : 'Love it'}</button>
          <button class="btn glass" data-act="watchlist" data-id="${hero.id}">${heroList ? icon.check : icon.plus} Watchlist</button>
        </div>
      </div>
    </section>
    <div class="rows">
      ${rows[0] || ''}${rows[1] || ''}
      <a class="mood-cta" href="#/mood"><span class="mood-emojis">🌀⚡😂😭🖤☕🐉</span><div><b>Don’t know what to watch tonight?</b><small>Tell us your mood and how much time you have. The AI picks 3 shows.</small></div><span class="btn primary">Mood Match ${icon.chev('r')}</span></a>
      ${rows.slice(2).join('')}
    </div>`,
  };
}
