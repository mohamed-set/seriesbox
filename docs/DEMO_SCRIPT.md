# SeriesBox: 5-minute demo script

Before recording: open the app in a private window (fresh profile), browser at 1440×900, zoom 100%. Have a second tab ready with a profile already filled (Profile → *Fill with demo activity*) in case something goes wrong.

| Time | Screen | What to do | What to say |
|---|---|---|---|
| 0:00 | Onboarding | Type a name, pick an avatar colour, *Get started*. | “SeriesBox is Letterboxd for series and anime: track, rate, rank and discover shows, with an AI recommender at its core.” |
| 0:20 | Pick 3+ shows | Click 5 posters (e.g. Breaking Bad, Dark, Attack on Titan, Death Note, Arcane), *Build my taste profile*. | “New users are a cold-start problem for recommenders. Three picks are enough: we turn each show into a TF-IDF vector and build a taste profile.” |
| 0:40 | Taste DNA animation | Let the chips and first picks appear, *Enter SeriesBox*. | “Here is the taste DNA it extracted, and already the first matches.” |
| 0:55 | Home | Show the hero (#1 pick, match %, “because you loved…”), scroll the rows: Top picks, Because you loved X, New episodes this week, Top 10, taste twin, hidden gems. Hover a card. | “A Netflix-style home where every row is explained. ‘New episodes this week’ comes from the live AniList data, refreshed weekly by a GitHub Action.” |
| 1:30 | Title page | Open the hero show. Rate it 4.5★, click *Love it* (heart burst), set status *Watching*, episode 3. | “Half-star ratings, hearts, watchlist and episode tracking.” |
| 1:50 | Title page, AI | Point at the predicted rating on another unseen show, then *Why it’s similar* and *More like this*. | “Collaborative filtering predicts my rating from fans with similar taste; the content model explains similarity with shared themes.” |
| 2:10 | Reviews | Write a short review, post it. Click *Disagree* tab. | “I can confront my opinion with everyone else’s: here are the reviewers who disagree most with me, with their taste-match %.” |
| 2:35 | Hearts | Click *Hearts* in the nav. Sort by community score. | “Every show I love lands in my Hearts list, my coups de cœur.” |
| 2:50 | My Rankings | *Auto-rank from my ratings*, then drag one poster from A to S. *Share*. | “Tier lists are the most shared format on social media; drag and drop, auto-generated from ratings.” |
| 3:10 | Charts | Switch Series / Anime, metric *Trending* then *Most divisive*, filter genre. | “Community charts use a Bayesian weighted score so small samples don’t dominate; ‘most divisive’ ranks by rating variance.” |
| 3:35 | Community → user | Open *Community*, click the top taste twin. Show the ring, taste DNA, *Biggest disagreements* with both reviews side by side. Follow them. | “Compatibility is a Pearson correlation on shows we both rated. This is the social layer that keeps users coming back.” |
| 4:05 | Mood Match | Pick “Mind-bending”, “A weekend binge”: cards are dealt. Shuffle once. | “For indecisive evenings: the mood becomes a vector blended with my taste.” |
| 4:25 | Stats | Open the avatar (Profile): hours watched, genres, badges, critic persona. | “A Wrapped-style profile, a natural premium feature.” |
| 4:40 | AI Lab | Show the pipeline, the heatmap, click *Run evaluation*. | “We evaluated it offline: leave-one-out Hit Rate@10, the hybrid beats the popularity baseline by far. Business-wise: engagement, network effects, affiliate and premium revenue.” |
| 5:00 | End | Back to Home. | “SeriesBox: your next favourite show, explained.” |

Tips: press `/` to search during the demo (“time travel” is a good query). If posters are slow the first time, reload once: they are cached afterwards.
