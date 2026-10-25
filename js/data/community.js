// Seeded fake community: users with distinct tastes, their ratings, likes and reviews.
// Everything is deterministic (seeded RNG) so every classmate sees the same demo data.
import { TITLES } from './titles.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each persona loves some tags/genres and dislikes others.
const PERSONAS = [
  { name: 'Yuki Tanaka', handle: 'yuki.otaku', bio: 'Shonen addict. Fights > feelings (except Frieren).', love: ['shonen', 'superpowers', 'tournament', 'martial arts', 'friendship', 'Action'], hate: ['sitcom', 'period'], anime: 0.9 },
  { name: 'Marcus Reed', handle: 'prestige_marcus', bio: 'If it is on HBO and slow, I am in.', love: ['prestige', 'slow burn', 'anti-hero', 'Crime', 'family drama', 'political intrigue'], hate: ['shonen', 'high school', 'sitcom'], anime: 0.1 },
  { name: 'Léa Martin', handle: 'lea.watches', bio: 'Paris. Feel-good comedies and cozy rewatches.', love: ['feel-good', 'sitcom', 'wholesome', 'Comedy', 'workplace', 'romance'], hate: ['gore', 'dark', 'serial killer'], anime: 0.3 },
  { name: 'Diego Alvarez', handle: 'diegomindbend', bio: 'Give me twists, time loops and timelines on a whiteboard.', love: ['plot twists', 'time travel', 'mind games', 'conspiracy', 'Mystery', 'Sci-Fi', 'psychological'], hate: ['sitcom', 'wholesome'], anime: 0.45 },
  { name: 'Aiko Mori', handle: 'aiko_cries', bio: 'Rates shows by how many tissues I needed.', love: ['tearjerker', 'grief', 'coming of age', 'music', 'romance', 'healing', 'Drama'], hate: ['gore', 'parody'], anime: 0.8 },
  { name: 'Sam Okafor', handle: 'samthecritic', bio: 'Harsh but fair. A 4 from me is a 5 anywhere else.', love: ['prestige', 'satire', 'dark comedy', 'philosophy'], hate: ['shonen', 'isekai', 'teen'], anime: 0.25, harsh: 0.8 },
  { name: 'Nina Petrova', handle: 'nina.scifi', bio: 'Space, AI, cyberpunk. Hard sci-fi or nothing.', love: ['space', 'ai', 'cyberpunk', 'dystopia', 'Sci-Fi', 'technology', 'aliens'], hate: ['romance', 'sitcom'], anime: 0.4 },
  { name: 'Tom Becker', handle: 'tomtruecrime', bio: 'Detectives, killers and documentaries at 2am.', love: ['detective', 'serial killer', 'true story', 'Crime', 'murder', 'Thriller', 'cartel'], hate: ['magic', 'wholesome'], anime: 0.15 },
  { name: 'Hana Kim', handle: 'hana.k', bio: 'K-drama queen slowly converted to anime.', love: ['romance', 'survival', 'game of death', 'class struggle', 'Thriller', 'high school'], hate: ['parody'], anime: 0.5 },
  { name: 'Leo Rossi', handle: 'leo_fantasy', bio: 'Dragons, swords, maps at the start of the book.', love: ['Fantasy', 'medieval', 'dragons', 'magic', 'swords', 'political intrigue', 'Adventure'], hate: ['sitcom', 'workplace'], anime: 0.45 },
  { name: 'Chloé Dubois', handle: 'chloe_dark', bio: 'The darker the better. Horror & gore welcome.', love: ['dark', 'gore', 'Horror', 'monsters', 'demons', 'psychological', 'survival'], hate: ['feel-good', 'wholesome', 'sitcom'], anime: 0.6 },
  { name: 'Ravi Patel', handle: 'ravi.laughs', bio: 'Stand-up nerd. Rates sitcoms like fine wine.', love: ['sitcom', 'comedy', 'mockumentary', 'parody', 'Comedy', 'satire', 'ensemble'], hate: ['tragedy', 'gore'], anime: 0.2 },
  { name: 'Mei Lin', handle: 'meiseinen', bio: 'Seinen only. Monster is the best thing ever made.', love: ['seinen', 'psychological', 'philosophy', 'war', 'Drama', 'mature', 'tragedy'], hate: ['high school', 'sitcom'], anime: 0.85 },
  { name: 'Jake Thompson', handle: 'jake.binge', bio: 'Whatever is trending, I watched it this weekend.', love: [], hate: [], anime: 0.35, mainstream: 1.6 },
  { name: 'Sofia García', handle: 'sofi_series', bio: 'Heists, Spain, and anything with a great soundtrack.', love: ['heist', 'Thriller', 'betrayal', 'Crime', 'romance', 'music'], hate: ['isekai'], anime: 0.2 },
  { name: 'Kenji Watanabe', handle: 'kenji_mecha', bio: 'Evangelion changed my life. Mecha & sci-fi anime.', love: ['mecha', 'Sci-Fi', 'psychological', 'military', 'war', 'dystopia', 'space'], hate: ['sitcom', 'romance'], anime: 0.9 },
  { name: 'Emma Wilson', handle: 'emma.cozy', bio: 'Slice of life, music, found family. Be kind.', love: ['found family', 'wholesome', 'slice of life', 'music', 'feel-good', 'friendship', 'band'], hate: ['gore', 'violence', 'serial killer'], anime: 0.65 },
  { name: 'Omar Haddad', handle: 'omar.history', bio: 'History buff. War dramas and period pieces.', love: ['war', 'historical', 'period', 'Historical', 'true story', 'military', 'samurai', 'vikings'], hate: ['parody', 'isekai'], anime: 0.35 },
  { name: 'Zoe Clarke', handle: 'zoe_teen', bio: 'Teen dramas, chaotic friend groups, Wednesday stan.', love: ['teen', 'high school', 'coming of age', 'supernatural', 'romance', 'gothic'], hate: ['war', 'slow burn'], anime: 0.4 },
  { name: 'Lucas Ferreira', handle: 'lucas_sports', bio: 'Sports anime cured my gym motivation.', love: ['sports', 'volleyball', 'football', 'rivals', 'tournament', 'Sports', 'friendship'], hate: ['horror', 'gore'], anime: 0.75 },
  { name: 'Ingrid Larsen', handle: 'ingrid.noir', bio: 'Nordic noir energy. Small towns hide big secrets.', love: ['small town', 'mystery', 'Mystery', 'detective', 'conspiracy', 'dark', 'murder'], hate: ['shonen', 'sitcom'], anime: 0.2 },
  { name: 'Alex Chen', handle: 'alex.animation', bio: 'Animation is a medium, not a genre.', love: ['Animation', 'adult animation', 'steampunk', 'surreal', 'cyberpunk', 'satire'], hate: [], anime: 0.6 },
  { name: 'Fatima Zahra', handle: 'fatima_fz', bio: 'Strong female leads and sharp writing.', love: ['prodigy', 'chess', 'genius', 'high society', 'British', 'british', 'Drama', 'period'], hate: ['gore', 'parody'], anime: 0.3 },
  { name: 'Ben Carter', handle: 'ben.isekai', bio: 'Reincarnated as a guy who rates isekai.', love: ['isekai', 'reincarnation', 'magic', 'dungeon', 'power fantasy', 'virtual reality', 'Fantasy'], hate: ['prestige', 'period'], anime: 0.95 },
  { name: 'Clara Novak', handle: 'clara.v', bio: 'Rewatched The Office 11 times. No regrets.', love: ['workplace', 'mockumentary', 'sitcom', 'cringe', 'romance', 'feel-good'], hate: ['horror'], anime: 0.15 },
  { name: 'Hiro Sato', handle: 'hiro_classic', bio: 'Old school: Bebop, Champloo, Gintama.', love: ['cult classic', 'jazz', 'bounty hunter', 'samurai', 'parody', 'space', 'noir'], hate: ['isekai'], anime: 0.85 },
  { name: 'Grace Liu', handle: 'grace.spy', bio: 'Spies, cons, double lives. Trust no one.', love: ['spy', 'betrayal', 'disguise', 'heist', 'mind games', 'conspiracy', 'family'], hate: ['gore'], anime: 0.45 },
  { name: 'Noah Schmidt', handle: 'noah.dark', bio: 'Dark (2017) is the GOAT and I will die on this hill.', love: ['time travel', 'small town', 'plot twists', 'family drama', 'philosophy', 'destiny'], hate: ['sitcom', 'teen'], anime: 0.3 },
  { name: 'Isabella Romano', handle: 'bella.romance', bio: 'Slow burn romance and costume drama.', love: ['romance', 'regency', 'high society', 'gossip', 'period', 'slow burn', 'Romance'], hate: ['gore', 'war'], anime: 0.35 },
  { name: 'Kai Nakamura', handle: 'kai.newgen', bio: 'Only watches what aired this decade.', love: ['superpowers', 'demons', 'shonen', 'idols', 'showbiz', 'dungeon', 'Action'], hate: ['period', 'sitcom'], anime: 0.85, recent: true },
  { name: 'Ethan Brooks', handle: 'ethan.superhero', bio: 'Supes, villains, multiverses. Mostly villains.', love: ['superpowers', 'heroes', 'multiverse', 'vigilante', 'marvel', 'satire', 'violence'], hate: ['period', 'romance'], anime: 0.4 },
  { name: 'Amara Diallo', handle: 'amara.d', bio: 'Social commentary and stories that stay with you.', love: ['social commentary', 'class struggle', 'satire', 'dystopia', 'hip hop', 'surreal'], hate: ['isekai'], anime: 0.3 },
  { name: 'Pierre Lefèvre', handle: 'pierre.fr', bio: 'Cinéphile. Lupin & Twin Peaks on repeat.', love: ['surreal', 'french', 'cult classic', 'mystery', 'Mystery', 'disguise', 'noir'], hate: ['shonen'], anime: 0.25, harsh: 0.4 },
  { name: 'Lily Evans', handle: 'lily.fan', bio: 'I give everything 5 stars. Life is short.', love: ['friendship', 'found family', 'romance', 'feel-good'], hate: [], anime: 0.5, generous: 0.9 },
  { name: 'Viktor Ivanov', handle: 'viktor.real', bio: 'Realism, history, disasters. Chernobyl 10/10.', love: ['true story', 'disaster', 'soviet', 'realistic', 'war', 'historical', 'bureaucracy'], hate: ['magic', 'isekai', 'parody'], anime: 0.1 },
  { name: 'Sara Haddad', handle: 'sara.reads', bio: 'Book-to-screen adaptations and quiet fantasy.', love: ['journey', 'magic', 'Fantasy', 'grief', 'philosophy', 'adventure', 'healing'], hate: ['gore'], anime: 0.6 },
];

const AVATAR_COLORS = ['#ff4d6d', '#7b5cff', '#00c2a8', '#ffb020', '#3fa9f5', '#f25f5c', '#9b5de5', '#00bbf9', '#f15bb5', '#43aa8b', '#ff7f11', '#577590'];

const has = (t, label) => t.tags.includes(label) || t.genres.includes(label);

function affinity(p, t) {
  let a = 0;
  for (const l of p.love) if (has(t, l)) a += 1;
  for (const h of p.hate) if (has(t, h)) a -= 1.3;
  const kindFit = t.kind === 'anime' ? p.anime : 1 - p.anime;
  a += (kindFit - 0.5) * 2.2;
  if (p.recent) a += t.year >= 2018 ? 0.8 : -1;
  return a;
}

// Review text building blocks.
const TAG_LINES = {
  'plot twists': ['The twists genuinely caught me off guard.', 'Every episode ends with a twist that rewires the whole story.'],
  'anti-hero': ['Watching a protagonist you should hate become someone you root for is wild.', 'The best anti-hero arc I have seen.'],
  'slow burn': ['It takes its time, but the payoff is enormous.', 'Patience is rewarded, the slow burn is the point.'],
  'dark': ['Bleak, heavy and impossible to look away from.', 'It goes to dark places most shows would not dare.'],
  'time travel': ['I needed a whiteboard for the timelines and loved every second.', 'The time travel logic actually holds together.'],
  'friendship': ['The friendships feel earned and real.', 'Came for the plot, stayed for the friendships.'],
  'found family': ['That found family dynamic got me every time.', 'A cast I would happily adopt as my own family.'],
  'feel-good': ['Pure comfort TV. Instant mood booster.', 'Watched it on a bad week and it fixed me.'],
  'sitcom': ['Rewatchable forever, the jokes still land.', 'Some of the best ensemble comedy writing ever.'],
  'shonen': ['Peak shonen energy, the fights are insane.', 'Hype moments every few episodes, the animation goes crazy.'],
  'tearjerker': ['I cried. A lot. Several times.', 'Emotionally destroyed me in the best way.'],
  'political intrigue': ['The scheming and politics are chess-level.', 'Every conversation is a battle of power.'],
  'mind games': ['The mind games are so satisfying to follow.', 'Two geniuses outsmarting each other, I was hooked.'],
  'superpowers': ['Creative powers and smart rules for them.', 'Finally a power system that makes sense.'],
  'coming of age': ['A coming-of-age story that feels honest.', 'It understands growing up better than most shows.'],
  'prestige': ['Television at its absolute peak.', 'Every frame looks like a film.'],
  'satire': ['Sharp satire that is still funny on rewatch.', 'Smart, biting and a little too real.'],
  'detective': ['Great detective work, I kept trying to solve it first.', 'A mystery that respects your intelligence.'],
  'war': ['Brutal and honest about what war costs.', 'The war storyline hits incredibly hard.'],
  'romance': ['The romance is so well written, I was screaming.', 'The chemistry between the leads carries everything.'],
  'conspiracy': ['The conspiracy keeps unfolding layer after layer.', 'Paranoid in the best possible way.'],
  'survival': ['Tense survival stakes the whole way through.', 'You never feel anyone is safe.'],
  'comedy': ['Laughed out loud constantly.', 'The comedic timing is perfect.'],
  'dystopia': ['A dystopia that feels uncomfortably close.', 'Great worldbuilding, scary and believable.'],
  'monsters': ['The monster designs are terrifying.', 'Creepy, creative creatures everywhere.'],
  'wholesome': ['So wholesome it should be prescribed by doctors.', 'Warm, gentle and kind.'],
  'workplace': ['The workplace dynamics are painfully relatable.', 'Never thought office life could be this entertaining.'],
  'family drama': ['The family dynamics are messy and painfully real.', 'Every family dinner scene is a horror movie.'],
  'magic': ['The magic system is gorgeous.', 'The worldbuilding and magic are top tier.'],
  'music': ['The soundtrack alone deserves an award.', 'The music is doing half the storytelling.'],
  'psychological': ['A psychological deep dive that stays with you.', 'It messes with your head in the best way.'],
  'heist': ['Heist planning scenes are pure dopamine.', 'Clever, tense and stylish heist storytelling.'],
  'tragedy': ['A tragedy that is beautiful and devastating.', 'You know where it is going and it still hurts.'],
  'serial killer': ['Chilling and very disturbing in a good way.', 'The killer interviews gave me goosebumps.'],
  'true story': ['Hard to believe this really happened.', 'Respectful and gripping retelling of real events.'],
  'space': ['Space has never looked this real.', 'Realistic space politics and physics, love it.'],
};
const OPEN = {
  5: ['Masterpiece.', 'All-time favorite.', 'Absolutely perfect.', 'Easily a 10/10.', 'Nothing comes close.'],
  4: ['Really, really good.', 'Loved it.', 'Highly recommend.', 'Great watch.', 'So close to perfect.'],
  3: ['Solid but not life changing.', 'Good, with some flaws.', 'Enjoyable enough.', 'Mixed feelings.', 'Decent watch.'],
  2: ['Not for me.', 'Overhyped honestly.', 'Wanted to like it more.', 'Pretty disappointing.', 'I do not get the hype.'],
  1: ['Hard pass.', 'Dropped it.', 'Painful to finish.', 'Nope.', 'Could not get into it at all.'],
};
const CLOSE = {
  5: ['Watch it now.', 'Will rewatch every year.', 'Go in blind.', 'Do not skip this one.', ''],
  4: ['A couple of slow episodes but worth it.', 'Final season was a bit weaker.', 'Would recommend to anyone.', '', ''],
  3: ['The pacing really drags in the middle.', 'Great start, weaker ending.', 'Characters could be better written.', '', ''],
  2: ['Pacing killed it for me.', 'The characters annoyed me.', 'Too long for what it says.', 'Maybe it gets better later?', ''],
  1: ['Life is too short.', 'Not my type of show at all.', 'Gave it three episodes.', '', ''],
};
const NEG_LINES = ['The pacing is all over the place.', 'Could not connect with the main character.', 'Way too slow for me.', 'The tone was just not for me.', 'Too much filler.'];

function buildReview(r, t, rating) {
  const bucket = Math.max(1, Math.min(5, Math.round(rating)));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const parts = [pick(OPEN[bucket])];
  const tagLines = t.tags.filter((g) => TAG_LINES[g]);
  if (bucket >= 3 && tagLines.length) {
    parts.push(pick(TAG_LINES[pick(tagLines)]));
    if (bucket >= 4 && tagLines.length > 1 && r() < 0.5) parts.push(pick(TAG_LINES[pick(tagLines)]));
  } else if (bucket < 3) parts.push(pick(NEG_LINES));
  const close = pick(CLOSE[bucket]);
  if (close) parts.push(close);
  return [...new Set(parts)].join(' ');
}

function daysAgo(r) {
  const d = new Date('2026-10-25T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - Math.floor(r() * r() * 400));
  d.setUTCHours(Math.floor(r() * 24), Math.floor(r() * 60));
  return d.toISOString();
}

function buildCommunity() {
  const users = [];
  const ratings = {}; // userId -> {titleId: rating}
  const likes = {};
  const reviews = []; // {id,userId,titleId,rating,text,date,likes,spoiler}
  PERSONAS.forEach((p, i) => {
    const r = rng(1000 + i * 77);
    const id = p.handle;
    users.push({ id, name: p.name, handle: p.handle, bio: p.bio, color: AVATAR_COLORS[i % AVATAR_COLORS.length], joined: 2019 + (i % 7), followers: Math.floor(80 + r() * 4200) });
    ratings[id] = {};
    likes[id] = {};
    for (const t of TITLES) {
      const a = affinity(p, t);
      const pop = (t.popularity / 100) * (p.mainstream || 1);
      const pWatch = Math.min(0.95, Math.max(0.02, 0.04 + pop * 0.32 + a * 0.12));
      if (r() > pWatch) continue;
      let score = 0.75 + (t.quality - 5) * 0.72 + a * 0.45 + (r() - 0.5) * 1.3;
      if (p.harsh) score -= p.harsh;
      if (p.generous) score += p.generous;
      score = Math.max(0.5, Math.min(5, Math.round(score * 2) / 2));
      ratings[id][t.id] = score;
      if (score >= 4.5 || (score >= 4 && r() < 0.35)) likes[id][t.id] = true;
      if (r() < 0.42) {
        reviews.push({
          id: `${id}:${t.id}`, userId: id, titleId: t.id, rating: score, text: buildReview(r, t, score),
          date: daysAgo(r), likes: Math.floor(r() * r() * 900), spoiler: false,
        });
      }
    }
  });
  reviews.sort((a, b) => b.date.localeCompare(a.date));
  return { users, ratings, likes, reviews };
}

export const COMMUNITY = buildCommunity();
export const USER_BY_ID = Object.fromEntries(COMMUNITY.users.map((u) => [u.id, u]));
