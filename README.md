# Shorts Intelligence

A focused analytics dashboard for discovering breakout Roblox YouTube Shorts,
tracking viral momentum, and reverse-engineering successful videos scene by scene.
Ships pointed at `roblox` over a rolling 7-day window.

**Live:** https://mahshid-aghania.github.io/youtube-grow/

No framework, no bundler, no runtime dependencies — plain ES modules the browser
loads directly, so the production build is a file copy and the page stays fast.

The [design brief](docs/design-brief.md) that specified this interface is kept
in the repo alongside it.

## Interface

| Layer | File | Role |
| --- | --- | --- |
| Design system | `src/styles.css` | Tokens (colour, radii, spacing, motion) and every component class |
| Interface | `src/app.js` | Shell, navigation, tables, chart, analyzer — small component functions |
| Presentation logic | `src/insights.js` | Overview metrics and grounded observations |
| Formatting | `src/format.js` | One implementation per number, duration and date format |
| Analysis | `src/shorts.js`, `src/shotlist.js` | Unchanged business logic |

Sections: Overview · Top Shorts · Trending Now · Top Channels · Breakout Videos ·
Shot Analyzer. Tables sort, filter and expand; below 760px they become stacked
cards rather than a horizontally scrolling grid.

### What the metrics are, and are not

Every figure is computed from the committed snapshot. There is **no trend data** —
a snapshot is a single window with no history — so the dashboard never shows a
percentage change or a period-over-period comparison. "Views/hr" is lifetime views
divided by hours since publication: an average pace, not a live rate from YouTube
Analytics.

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

### Scene-by-scene shot lists

The site has a **Scene-by-scene shot list** section: paste a YouTube Short link and
it renders every scene — timecode, how long the scene holds and what share of the
runtime that is, what the character does, what they say, and how the camera moves —
plus the hook, its thumbnail, and why the first three seconds work. The longest
scene is highlighted, since in a Short that is almost always the payoff.

Each row also carries a frame. YouTube publishes exactly three stills per video
(`1.jpg`, `2.jpg`, `3.jpg`, at roughly a quarter, half and three-quarters through),
and those are the only per-timestamp images available without downloading the file.
`frameForScene` maps each scene to the nearest one and reports whether that still
actually falls inside the scene — a Short with more scenes than stills necessarily
shares frames, and a shared still is dimmed and marked `≈` rather than presented as
that scene's own shot. True per-scene frames would require downloading the video and
extracting them with ffmpeg.

`src/shotlist.js` parses the pasted link (every YouTube URL shape, or a bare id),
validates the record, computes the per-scene shares, and does the frame mapping. Records live in
`data/shotlists/<videoId>.json` and are listed in `data/shotlists/index.json` — the
test suite fails if a file is added without listing it, since an unlisted shot list
is invisible to the page.

### Adding a video

**The page cannot analyse a video by itself.** Turning footage into scenes needs a
model that can watch it; a static site has no way to do that, and there is no
public API that returns a shot list. So the flow is:

1. Send the link to Claude in a session with video-analysis tools available
2. Claude writes `data/shotlists/<videoId>.json` and adds the id to `index.json`
3. `npm test` validates it, and the next push deploys it

Three shot lists ship with the repo, covering the top Roblox Shorts of the window.

## Coverage — read this before quoting a total

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
