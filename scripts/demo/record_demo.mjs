// Records the SeriesBox demo video (no voice-over: on-screen callout bubbles explain each feature),
// following docs/DEMO_SCRIPT.md.
// Usage: node scripts/demo/record_demo.mjs <app-url> <out-dir>
// Writes <out-dir>/raw.webm and <out-dir>/marks.json (where the demo starts and ends, in seconds).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const [url = 'http://localhost:8000/', outDir = 'demo-out'] = process.argv.slice(2);
// Reading speed for the bubbles; raise PACE to slow the whole video down.
const PACE = +process.env.PACE || 0.85;
const W = 1280, H = 720;
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: outDir, size: { width: W, height: H } },
  permissions: ['clipboard-read', 'clipboard-write'],
});

// Overlay layer injected in every page: visible cursor, click ripple, section chip, callout bubbles, title cards.
await ctx.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const css = document.createElement('style');
    css.textContent = `
      #demo-cursor{position:fixed;z-index:99999;width:22px;height:22px;margin:-3px 0 0 -3px;pointer-events:none;
        background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 2l7 19 2.5-7.5L20 11z' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat;transition:transform .1s}
      #demo-cursor.down{transform:scale(.8)}
      .demo-ripple{position:fixed;z-index:99998;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;pointer-events:none;
        border:3px solid #ff2e63;animation:demo-rip .5s ease-out forwards}
      @keyframes demo-rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
      #demo-sec{position:fixed;z-index:99997;right:18px;bottom:18px;padding:6px 13px;border-radius:999px;background:#ff2e63;color:#fff;
        font:700 13px system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;pointer-events:none;box-shadow:0 4px 18px #0008}
      #demo-sec:empty{display:none}
      .demo-ring{position:fixed;z-index:99990;border:3px solid #ffd23f;border-radius:12px;pointer-events:none;
        box-shadow:0 0 0 4px #ffd23f33,0 0 26px #ffd23f88;animation:demo-in .35s ease-out}
      .demo-bub{position:fixed;z-index:99995;max-width:360px;padding:12px 16px;border-radius:14px;background:#fff;color:#14141c;
        font:500 16.5px/1.38 system-ui,sans-serif;box-shadow:0 10px 34px #000a;pointer-events:none;animation:demo-in .35s ease-out}
      .demo-bub b{color:#e0164e}
      .demo-bub .demo-n{display:inline-grid;place-items:center;width:22px;height:22px;margin-right:7px;border-radius:50%;background:#ff2e63;color:#fff;font-size:12px;font-weight:800;vertical-align:1px}
      .demo-bub:after{content:'';position:absolute;width:16px;height:16px;background:#fff;transform:rotate(45deg);left:var(--ax);top:var(--ay)}
      @keyframes demo-in{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
      #demo-card{position:fixed;inset:0;z-index:99996;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
        background:radial-gradient(circle at 50% 40%,#2a0b16,#07070a 70%);color:#fff;font-family:system-ui,sans-serif;transition:opacity .8s;text-align:center}
      #demo-card h1{font-size:84px;margin:0;letter-spacing:-.02em}#demo-card h1 b{color:#ff2e63}
      #demo-card h2{font-size:52px;margin:0}#demo-card h2 b{color:#ff2e63}
      #demo-card p{font-size:26px;margin:0;opacity:.88;max-width:900px}#demo-card small{font-size:17px;opacity:.6;margin-top:18px}
      #demo-card ul{list-style:none;padding:0;margin:10px 0 0;font-size:22px;line-height:1.8;opacity:.9}
      #demo-card.hide{opacity:0;pointer-events:none}`;
    document.head.append(css);
    const cur = Object.assign(document.createElement('div'), { id: 'demo-cursor' });
    const sec = Object.assign(document.createElement('div'), { id: 'demo-sec' });
    document.body.append(cur, sec);
    addEventListener('mousemove', (e) => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', (e) => {
      cur.classList.add('down');
      const r = Object.assign(document.createElement('div'), { className: 'demo-ripple' });
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.append(r); setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener('mouseup', () => cur.classList.remove('down'), true);
  });
  // Draws a highlight ring around rect r and a bubble with an arrow next to it.
  window.__demoBubble = (r, html, place) => {
    document.querySelectorAll('.demo-ring,.demo-bub').forEach((e) => e.remove());
    if (!r) return;
    const W = innerWidth, H = innerHeight, pad = 6, gap = 18;
    const ring = Object.assign(document.createElement('div'), { className: 'demo-ring' });
    Object.assign(ring.style, { left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px' });
    const b = Object.assign(document.createElement('div'), { className: 'demo-bub', innerHTML: html });
    document.body.append(ring, b);
    const bw = b.offsetWidth, bh = b.offsetHeight;
    const fits = {
      bottom: r.y + r.height + pad + gap + bh < H - 10,
      top: r.y - pad - gap - bh > 10,
      right: r.x + r.width + pad + gap + bw < W - 10,
      left: r.x - pad - gap - bw > 10,
    };
    if (!place || !fits[place]) place = ['bottom', 'top', 'right', 'left'].find((p) => fits[p]) || 'inside';
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let x, y;
    if (place === 'bottom' || place === 'top') {
      x = clamp(cx - bw / 2, 12, W - bw - 12);
      y = place === 'bottom' ? r.y + r.height + pad + gap : r.y - pad - gap - bh;
      b.style.setProperty('--ax', clamp(cx - x - 8, 14, bw - 30) + 'px');
      b.style.setProperty('--ay', place === 'bottom' ? '-8px' : bh - 8 + 'px');
    } else if (place === 'right' || place === 'left') {
      y = clamp(cy - bh / 2, 12, H - bh - 12);
      x = place === 'right' ? r.x + r.width + pad + gap : r.x - pad - gap - bw;
      b.style.setProperty('--ay', clamp(cy - y - 8, 10, bh - 26) + 'px');
      b.style.setProperty('--ax', place === 'right' ? '-8px' : bw - 8 + 'px');
    } else {
      x = clamp(cx - bw / 2, 12, W - bw - 12); y = clamp(r.y + 20, 12, H - bh - 12);
      b.style.setProperty('--ax', '-999px');
    }
    b.style.left = x + 'px'; b.style.top = y + 'px';
  };
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mouse = { x: W / 2, y: H / 2 };

// 1) Warm-up page: lets posters and banners load into the app's localStorage cache, then is discarded.
{
  const warm = await ctx.newPage();
  await warm.goto(url);
  await warm.evaluate(() => {
    localStorage.setItem('seriesbox:v1', JSON.stringify({ profile: { name: 'warm', color: '#ff2e63' }, ratings: {}, likes: [] }));
  }).catch(() => {});
  await warm.reload();
  await sleep(+process.env.WARMUP_MS || 45000);
  await warm.evaluate(() => localStorage.removeItem('seriesbox:v1'));
  await warm.close();
}

// 2) The recorded page.
const page = await ctx.newPage();
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const marks = [];
let step = 0;

const loc = (t) => (typeof t === 'string' ? page.locator(t).first() : t);
async function exists(t) { return (await loc(t).count()) > 0; }
async function section(name) {
  marks.push({ section: name, t: now() });
  console.log(`${now().toFixed(1)}s  ${name}`);
  await page.evaluate((s) => { const x = document.getElementById('demo-sec'); if (x) x.textContent = s; }, name).catch(() => {});
}
async function clearBubble() { await page.evaluate(() => window.__demoBubble(null)).catch(() => {}); }
// Points a numbered bubble at an element and leaves time to read it.
async function bubble(t, html, { place, wait = true, center = true } = {}) {
  const l = loc(t);
  if (!(await exists(l))) { console.log('  (skipped bubble)', html.replace(/<[^>]+>/g, '').slice(0, 50)); return false; }
  await clearBubble();
  if (center) { await l.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' })); await sleep(650); }
  const r = await l.boundingBox();
  if (!r) return false;
  step += 1;
  await page.evaluate(([r, h, p]) => window.__demoBubble(r, h, p), [r, `<span class="demo-n">${step}</span>${html}`, place]);
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  if (wait) await sleep(PACE * Math.max(2200, 900 + words * 300));
  return true;
}
async function moveTo(x, y, steps = 25) {
  const sx = mouse.x, sy = mouse.y;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(12);
  }
  mouse = { x, y };
}
async function hover(t) {
  const l = loc(t);
  await l.scrollIntoViewIfNeeded();
  await sleep(200);
  const b = await l.boundingBox();
  await moveTo(b.x + b.width / 2, b.y + b.height / 2);
  return l;
}
async function click(t, pause = 700) {
  await hover(t);
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  await sleep(pause);
}
async function type(sel, text) {
  await click(sel, 200);
  await page.keyboard.type(text, { delay: 110 });
}
async function scroll(dy, steps = 30) {
  await clearBubble();
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(25); }
  await sleep(400);
}
async function top() { await clearBubble(); await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await sleep(700); }
async function nav(href) { await clearBubble(); await click(`nav.links a[href="${href}"]`, 1300); }
async function card(html, ms) {
  await clearBubble();
  await page.evaluate((h) => {
    document.getElementById('demo-card')?.remove();
    const d = Object.assign(document.createElement('div'), { id: 'demo-card', className: 'hide', innerHTML: h });
    document.body.append(d);
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.remove('hide')));
  }, html);
  await sleep(ms);
}
async function uncard() { await page.evaluate(() => document.getElementById('demo-card')?.classList.add('hide')); await sleep(800); }
const h3 = (text) => page.locator(`h3:has-text("${text}")`).first().locator('xpath=..');
const row = (text) => page.locator(`section.row:has(h2:has-text("${text}"))`).first();

await page.goto(url);
await page.waitForSelector('#onb-name');
await sleep(500);
const start = now();

// ---- Intro
await card('<h1>Series<b>Box</b></h1><p>Letterboxd for TV series &amp; anime: track, rate, rank and discover shows, with an AI recommender at its core.</p><small>AI for Business · product demo</small>', 6500 * PACE);
await card('<h2>Let’s start as a <b>brand-new user</b></h2>', 2600 * PACE);
await uncard();

// ---- Onboarding
await section('1 · Onboarding');
await bubble('#onb-name', 'Create a profile in seconds: <b>just a name</b>…', { place: 'right' });
await type('#onb-name', 'Moha');
await bubble('button.color >> nth=0', '…and an <b>avatar colour</b>.', { place: 'bottom', wait: false });
await click('button.color[data-c="#8b5cf6"]', 1800);
await click('#onb-next', 1000);
await bubble('.pick-grid', '<b>Cold start:</b> a new user has no history, so we only ask for <b>3+ shows they love</b>.', { place: 'top', center: false });
for (const id of ['breaking-bad', 'dark', 'attack-on-titan', 'death-note', 'arcane']) {
  const p = page.locator(`button.pick[data-id="${id}"]`);
  await clearBubble();
  await p.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(450);
  await click(p, 300);
  if (id === 'breaking-bad') await bubble(p, 'Each show becomes a <b>TF-IDF vector</b> of its genres, themes, creators and synopsis words.', { place: 'right', center: false });
}
await bubble('#onb-done', 'Breaking Bad, Dark, Attack on Titan, Death Note, Arcane: their vectors are summed into my <b>taste profile</b>.', { place: 'top' });
await click('#onb-done', 2400);
await bubble('.dna-chips', 'My <b>taste DNA</b>: the strongest features the AI found in my picks.', { place: 'bottom', center: false });
await bubble('.onb3-rec >> nth=0', 'And already my <b>first recommendations</b>, before rating anything.', { place: 'right', center: false });
await clearBubble();
await click('#onb-go', 1500);

// ---- Home
await section('2 · Home');
await bubble('.hero-kicker', 'My <b>#1 AI pick</b>, with its <b>match %</b>…', { place: 'bottom', center: false });
await bubble('.hero-title', '…a Netflix-style home where <b>every recommendation is explained</b> (“because you loved…”).', { place: 'right', center: false });
await scroll(420);
await bubble(row('Top picks').locator('h2'), '<b>Top picks</b>: hybrid AI ranking (content + collaborative filtering).', { place: 'right' });
await hover(row('Top picks').locator('a.card').nth(1)); await sleep(800);
await bubble(row('Because you loved').locator('h2'), '<b>Because you loved…</b>: shows closest to one of my favourites.', { place: 'right' });
if (!(await bubble(row('New episodes').locator('h2'), '<b>Live data</b>: episodes airing this week from AniList, refreshed every Monday by a <b>GitHub Action</b>.', { place: 'right' })))
  await bubble(row('Currently airing').locator('h2'), '<b>Live data</b> from TVmaze and AniList, refreshed every Monday by a <b>GitHub Action</b>.', { place: 'right' });
await bubble('.top10', '<b>Top 10</b> series and anime of the week, from community activity.', { place: 'top' });
await bubble(row('Hidden gems').locator('h2'), '<b>Hidden gems</b>: highly rated by fans like me but little watched.', { place: 'right' });

// ---- Title page
await top();
await section('3 · Title page');
await clearBubble();
await click('.hero-btns a.btn.primary', 1600);
if (await exists('.predict')) await bubble('.predict', 'Before I even rate it, the AI <b>predicts my rating</b>.', { place: 'top' });
await bubble('.star-input', '<b>Half-star ratings</b>, like Letterboxd.', { place: 'top' });
await click('.star-input i[data-v="4.5"]', 900);
await bubble('button.btn[data-act="like"]', '<b>Love it</b> ❤ adds the show to my <b>Hearts</b> list.', { place: 'top', wait: false });
await click('button.btn[data-act="like"]', 2200);
await bubble('select#status', '<b>Watch status</b> and <b>episode tracker</b>.', { place: 'top', wait: false });
await hover('select#status');
await page.locator('select#status').selectOption('watching'); await sleep(900);
await click('input#ep', 200);
await page.keyboard.press('Control+A'); await page.keyboard.type('3', { delay: 150 }); await page.keyboard.press('Tab');
await sleep(1500);
await bubble('.compare-box', '<b>Me vs the community</b>: my rating against everyone else’s.', { place: 'bottom' });

await section('3 · Reviews');
await bubble('textarea#review-text', 'Write a <b>review</b> (with a spoiler flag)…', { place: 'top' });
await type('textarea#review-text', 'A masterpiece. Slow start, but every episode pays off.');
await click('#review-save', 1300);
if (await exists('.reviews-head button[data-tab="disagree"]')) {
  await bubble('.reviews-head .seg', '…then <b>compare opinions</b>: reviews from people who agree or <b>disagree</b> with me.', { place: 'top' });
  await click('.reviews-head button[data-tab="disagree"]', 1200);
  await bubble('article.review:not(.mine)', 'Reviewers who <b>disagree most</b> with me, with their taste-match %.', { place: 'top' });
}

// ---- An unseen show: predicted rating and similarity
await section('4 · AI on every page');
const unseen = page.locator('section.ai-row a.card:not(:has(.my-rating))').first();
await bubble('section.ai-row', '<b>More like this</b>: content-based neighbours. Let’s open one I haven’t seen.', { place: 'top' });
await clearBubble();
await click(unseen, 1500);
await top();
await bubble('.predict', '<b>Collaborative filtering</b> predicts my rating from fans with a similar taste.', { place: 'bottom' });
await bubble('.ai-panel', '<b>Why it’s similar</b>: shared themes explain each recommendation. <b>Fans also loved</b>: item-to-item collaborative filtering.', { place: 'left' });

// ---- Demo activity
await section('5 · A few weeks later');
await clearBubble();
await click('a.nav-me', 1300);
await bubble('#demo-fill', 'Fast-forward: I load the built-in <b>demo activity</b> (~20 rated shows, reviews) to show a fuller profile.', { place: 'top' });
await click('#demo-fill', 1500);

// ---- Hearts
await section('5 · Hearts');
await nav('#/lists');
await bubble('.grid', '<b>Hearts</b>: every show I love, my list of favourites.', { place: 'top', center: false });
await bubble('.list-tools .seg', 'Sortable, here by <b>community score</b>. Watchlist, in progress, reviews and diary in the tabs.', { place: 'bottom', center: false });
await click('.list-tools button[data-sort="community"]', 1500);

// ---- Rankings
await section('6 · My Rankings');
await nav('#/rankings');
await bubble('#auto', 'A <b>tier list</b> (S to D) <b>generated from my ratings</b>.', { place: 'bottom', center: false });
await click('#auto', 1500);
const src = page.locator('.tier-drop[data-tier="A"] .tile').first();
if (await exists(src)) {
  await bubble(src, '<b>Drag and drop</b> to move a show up a tier.', { place: 'bottom', center: false });
  await clearBubble();
  const id = await src.getAttribute('data-id');
  await hover(src); await sleep(300);
  const b = await page.locator('.tier-drop[data-tier="S"]').boundingBox();
  await page.mouse.down();
  await moveTo(b.x + b.width - 80, b.y + b.height / 2, 35);
  await page.mouse.up();
  // Headless mouse moves do not fire native HTML5 drag events: perform the drop explicitly.
  await page.locator(`.tile[data-id="${id}"]`).first().dragTo(page.locator('.tier-drop[data-tier="S"]')).catch(() => {});
  await sleep(900);
  await bubble(`.tier-drop[data-tier="S"] .tile[data-id="${id}"]`, 'Moved to <b>S tier</b>, saved automatically.', { place: 'bottom', center: false });
}
await bubble('#share', '<b>Share</b> it: tier lists are one of the most shared formats on social media.', { place: 'bottom', wait: false });
await click('#share', 3200);

// ---- Charts
await section('7 · Charts');
await nav('#/charts');
await bubble('a.pod >> nth=0', 'Community charts use a <b>Bayesian weighted score</b>: 2 ratings can’t beat 200.', { place: 'top' });
await top();
await bubble('.filters button[data-kind="anime"]', 'Series, <b>anime</b> or both…', { place: 'bottom', wait: false, center: false });
await click('.filters button[data-kind="anime"]', 1600);
await bubble('button[data-metric="trending"]', '…<b>trending</b> now…', { place: 'bottom', wait: false, center: false });
await click('button[data-metric="trending"]', 1700);
await bubble('button[data-metric="divisive"]', '…or the <b>most divisive</b> shows, ranked by <b>rating variance</b>.', { place: 'bottom', wait: false, center: false });
await click('button[data-metric="divisive"]', 3200);
await bubble('select#genre', 'Filter by <b>genre</b> and decade.', { place: 'bottom', wait: false, center: false });
const g = await hover('select#genre');
const opts = await g.locator('option').allTextContents();
await g.selectOption(opts.includes('Drama') ? 'Drama' : opts[1]); await sleep(2200);

// ---- Community
await section('8 · Community');
await nav('#/community');
await bubble('.twins a.twin >> nth=0', 'My <b>taste twins</b>: compatibility = <b>Pearson correlation</b> on the shows we both rated.', { place: 'bottom', center: false });
await clearBubble();
await click('.twins a.twin >> nth=0', 1500);
await bubble('.compat-panel', 'Our <b>taste compatibility</b> and taste DNA side by side.', { place: 'top' });
await bubble('.user-hero button[data-follow]', '<b>Follow</b> members to see their activity.', { place: 'bottom', wait: false, center: false });
await click('.user-hero button[data-follow]', 2200);
const dis = page.locator('section.panel:has(h3:has-text("Biggest disagreements"))').first();
await bubble(dis.locator('.dis-item').first(), 'Our <b>biggest disagreements</b>, with both reviews side by side.', { place: 'top' });

// ---- Mood Match
await section('9 · Mood Match');
await nav('#/mood');
await bubble('button.mood[data-mood="Mind-bending"]', '“What should I watch tonight?” Pick a <b>mood</b>…', { place: 'bottom', wait: false, center: false });
await click('button.mood[data-mood="Mind-bending"]', 1800);
await bubble('button[data-budget="A weekend binge"]', '…and a <b>time budget</b>.', { place: 'bottom', wait: false, center: false });
await click('button[data-budget="A weekend binge"]', 2400);
await bubble('#mood-out', 'The mood becomes a <b>vector blended with my taste</b>: three shows are dealt.', { place: 'top' });
await bubble('#reroll', 'Not convinced? <b>Shuffle</b> with another mood.', { place: 'top', wait: false });
await click('#reroll', 2600);

// ---- Stats
await section('10 · Stats');
await clearBubble();
await click('a.nav-me', 1300);
await bubble('.stat-tile >> nth=0', 'A <b>Wrapped-style</b> profile: hours watched, shows, hearts, average rating.', { place: 'bottom' });
if (await exists('.persona')) await bubble('.persona', 'My <b>critic persona</b>, computed from how I rate compared with the community.', { place: 'bottom' });
await bubble(h3('Badges'), '<b>Badges</b> to unlock: a natural premium feature.', { place: 'top' });

// ---- AI Lab
await section('11 · AI Lab');
await nav('#/lab');
await bubble(h3('The pipeline'), '<b>The AI Lab</b> explains the recommender: content model + collaborative filtering = <b>hybrid</b>.', { place: 'bottom' });
await bubble(h3('Inside a vector'), 'Inside a <b>TF-IDF vector</b>: the weighted features of a show.', { place: 'right' });
await bubble('#run-eval', '<b>Offline evaluation</b>: leave-one-out <b>Hit Rate@10</b> on the community.', { place: 'top', wait: false });
await click('#run-eval', 400);
await page.waitForSelector('#eval-out .eval-row', { timeout: 60000 }).catch(() => {});
await sleep(800);
await bubble('#eval-out', 'The <b>hybrid model</b> clearly beats the popularity baseline.', { place: 'top' });
if (await exists(h3('Business value'))) await bubble(h3('Business value'), '<b>Business value</b>: engagement, network effects, affiliate and premium revenue.', { place: 'top' });

// ---- Outro
await top();
await page.evaluate(() => { location.hash = '#/'; });
await sleep(1500);
await section('');
await card('<h1>Series<b>Box</b></h1><p>Your next favourite show, explained.</p><ul><li>🎯 Hybrid AI recommender (TF-IDF + collaborative filtering)</li><li>📡 Live catalog from TVmaze &amp; AniList</li><li>👥 Social layer: reviews, taste twins, tier lists</li></ul><small>mohamed-set.github.io/seriesbox</small>', 7000 * PACE);
const end = now();

const video = page.video();
await page.close();
await ctx.close();
await browser.close();
fs.renameSync(await video.path(), path.join(outDir, 'raw.webm'));
fs.writeFileSync(path.join(outDir, 'marks.json'), JSON.stringify({ start, end, marks }, null, 1));
console.log(`Recorded ${(end - start).toFixed(1)}s of demo`);
