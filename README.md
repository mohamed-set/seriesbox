# SeriesBox

**Letterboxd for TV series and anime, with a Netflix-style interface and an AI recommender.**

Rate what you watch, keep a list of the shows you love (your *Hearts*), build tier-list rankings, browse community charts, compare your reviews with other fans and get AI-powered suggestions of similar shows.

AI for Business group project, October 2026.

## Run it

It is a static website: no install, no build, no API key.

```bash
git clone https://github.com/mohamed-set/seriesbox.git
cd seriesbox
python3 -m http.server 8000      # or: npx serve .
```

Then open http://localhost:8000. (Opening `index.html` directly with `file://` does not work because browsers block ES modules there.)

Online version: enable GitHub Pages (Settings → Pages → *Deploy from a branch* → `main` / root) and the app is served at `https://mohamed-set.github.io/seriesbox/`.

## Features

| Area | What you can do |
|---|---|
| Onboarding | Pick a name and 3+ shows you love; the AI builds your taste profile live (solves the cold start). |
| Home | Netflix-style hero with your #1 AI pick, personalised rows (“Top picks”, “Because you loved X”), Top 10 series / anime of the week, new episodes airing this week, your taste twin's favourites, hidden gems, fresh community reviews. |
| Title page | Half-star rating, ❤ like, watchlist, watching status + episode tracker, reviews with spoiler flag, rating histogram, chart rank, controversy score, **predicted rating for you**, **you vs the community**, reviews filtered by *agree / disagree with me*, “More like this” (content AI with explanations) and “Fans also loved” (collaborative filtering). |
| Hearts | Your favourites (coups de cœur), sortable, plus watchlist, in-progress shows, your reviews and an activity diary. |
| My Rankings | Drag-and-drop tier list (S to D), auto-generated from your ratings, shareable; ranked list of everything you rated. |
| Charts | Community rankings of series and anime: top rated (Bayesian weighted score), trending, most loved, most watched, most divisive; filters by genre and decade; podium. |
| Community | Taste twins and opposites (compatibility %), members to follow, activity feed. |
| User profile | Taste compatibility ring, taste DNA comparison, shows you both loved, **biggest disagreements side by side with both reviews**, recommendations from their list. |
| Mood Match | “What should I watch tonight?”: pick a mood and a time budget, the AI deals 3 shows. |
| Stats | Wrapped-style stats: hours watched, genres, series vs anime, rating distribution, decades, taste DNA, critic persona, badges. |
| AI Lab | Explains the recommender, shows TF-IDF vectors, a similarity heatmap and an offline evaluation (Hit Rate@10) against baselines. |

Press `/` anywhere to search (titles, genres or vibes such as “time travel”).

## Data

* **Catalog**: `data/catalog.json`, generated from live public APIs by `scripts/update_catalog.mjs`:
  * [TVmaze](https://www.tvmaze.com/api) for series (popular, well-rated scripted shows, seasons, posters, banners),
  * [AniList](https://anilist.co) GraphQL for anime (all-time popular, trending now, current season, next episode dates).

  A GitHub Action (`.github/workflows/update-catalog.yml`) re-runs it **every Monday** and commits the new catalog, so new and trending shows appear automatically. Run it by hand from the *Actions* tab (*Update catalog → Run workflow*) or locally with `node scripts/update_catalog.mjs` (Node 18+).
* **Curated seed**: `js/data/seed.js`, ~100 hand-tagged classics. They are always in the catalog and are the offline fallback.
* **Community**: `js/data/community.js` generates 36 fictional users with distinct tastes (shonen fan, prestige-drama fan, sitcom lover, harsh critic…), their ratings, likes and reviews. It is deterministic, so everybody sees the same demo data. *This community is simulated for the demo.*
* **Your data** stays in your browser (`localStorage`). Profile → *Export my data* downloads it as JSON; *Reset profile* starts over.

## The AI (js/ai.js)

1. **Content-based model.** Each show becomes a TF-IDF vector over its genres (×2.2), themes/tags (×1.6), creator or studio (×1.2), type, decade and synopsis words (×0.45). Cosine similarity gives “More like this” and the match %, and the top shared features are shown as the explanation.
2. **Taste profile.** Your hearts and ratings (centred on your own average) are summed into one vector: your *taste DNA*.
3. **Collaborative filtering.** User-user k-NN: similarity = Pearson correlation on co-rated shows mixed with absolute agreement, shrunk by overlap size. It predicts your rating for unseen shows and powers the compatibility %. Item-item co-likes give “Fans also loved”.
4. **Hybrid ranking.** `score = α·content + (1-α)·CF + quality prior`, with α decreasing as you rate more shows (cold start → content-heavy).
5. **Charts** use the IMDb Bayesian weighted rating so a show with 2 ratings cannot beat one with 200.
6. **Evaluation** (AI Lab): leave-one-out Hit Rate@10 on the community. On the live catalog (320 titles) the hybrid reaches about 54% vs 16% for a popularity baseline (content-only 50%, collaborative-only 23%).

## Project structure

```
index.html              app shell
css/style.css           design (dark, Netflix-inspired, responsive)
js/app.js               router, navigation, search, global actions
js/ai.js                recommender (TF-IDF, CF, hybrid, mood, evaluation)
js/store.js             user state (localStorage)
js/posters.js           poster/banner loading (catalog URLs, live API fallback)
js/ui.js                shared components (cards, rows, stars, charts)
js/views/*.js           one file per page
js/data/titles.js       loads data/catalog.json, falls back to the seed
js/data/seed.js         curated titles
js/data/community.js    simulated users, ratings and reviews
scripts/update_catalog.mjs   catalog builder (TVmaze + AniList)
docs/DEMO_SCRIPT.md     5-minute demo walkthrough
```

## Credits

Posters, banners and metadata: TVmaze (CC BY-SA) and AniList. Fonts: Inter and Bebas Neue (Google Fonts). Not affiliated with Letterboxd or Netflix.
