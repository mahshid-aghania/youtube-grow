# YouTube Grow

Tracks the biggest YouTube Shorts for a topic over a rolling window, and publishes
the report as a static site. Ships pointed at `roblox` over the last 7 days.

## What's here

| Path | Purpose |
| --- | --- |
| `src/shorts.js` | Shorts-report analysis: windowing, totals, rankings, per-channel and per-day rollups |
| `scripts/fetch-shorts.js` | Pulls a topic's Shorts from the YouTube Data API into `data/` |
| `scripts/build.js` | Copies `src/*.js` and `data/*.json` into `public/` for deployment |
| `data/roblox-shorts.json` | Committed snapshot — the site works with no API key |
| `test/` | Unit tests on Node's built-in runner — no dependencies, no network |
| `public/index.html` | The report page, deployed to GitHub Pages |
| `.github/workflows/ci.yml` | Runs the test suite on every push and pull request |
| `.github/workflows/deploy.yml` | Publishes `public/` to GitHub Pages on every push to `main` |
| `.github/workflows/refresh.yml` | Daily: re-fetches the window and commits it when the numbers move |

## The Shorts tracker

Reports on every Short published for a topic in a rolling window — by default
`roblox` over the last 7 days. It gives you total and median views, engagement
rate, a per-day breakdown, the top Shorts by views and by views-per-hour, the
channels taking the most views, and breakout videos ranked by views per
subscriber.

```bash
npm run fetch:shorts                              # refresh data/roblox-shorts.json
node scripts/fetch-shorts.js --topic minecraft    # any topic
node scripts/fetch-shorts.js --days 30 --pages 8  # wider window, deeper search
npm run build && npx http-server public           # view the report
```

### Coverage — read this before quoting a total

**The totals are the head of the distribution, not a census.** YouTube's Search
API does not expose a complete index of everything published, and it caps any
single query's result set. `scripts/fetch-shorts.js` pages through the top
results by view count, so what you get is the biggest Shorts for the topic in
the window — enough to see what's working, not enough to say "Roblox Shorts got
exactly N views this week". Every snapshot carries `coverage` and
`coverageNote` fields, and the page prints them above the numbers so a reader
can't mistake one for the other.

### Getting an API key

1. Create a project in the [Google Cloud console](https://console.cloud.google.com/)
2. Enable **YouTube Data API v3**
3. Create an API key under **Credentials**
4. Add it to the repo as a secret named `YOUTUBE_API_KEY`
   (**Settings → Secrets and variables → Actions**)

Without the key, `fetch:shorts` exits cleanly and the committed snapshot is
used, so CI, PRs, and forks all still pass. The daily refresh workflow passes
`--require-key` so it fails loudly rather than silently committing stale data.

Quota: one search page costs 100 units against a 10,000/day default, so the
4-page default run is roughly 400 units — about 25 refreshes a day.

## Run the tests locally

```bash
npm test          # or: node --test
```

The suite covers the report analysis, the API-response mapping, and the shape
of the committed snapshot itself. 18 tests, no network, no API key needed.

No `npm install` needed — the tests use `node:test` and `node:assert`, both built into Node 18+.

## The deployment

Every push to `main` publishes `public/` to GitHub Pages at:

**https://mahshid-aghania.github.io/youtube-grow/**

### One-time setup (required)

Pages has to be switched on by a repo admin before the first deploy can succeed.
The workflow cannot do it for you: `GITHUB_TOKEN` is not allowed to call the
create-Pages-site API, so `configure-pages` with `enablement: true` fails with
`Resource not accessible by integration`.

1. Go to **Settings → Pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions**

Then re-run the deploy: **Actions → Deploy → Run workflow**, or push any commit
to `main`.
