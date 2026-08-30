# Shorts Intelligence

A focused analytics dashboard for discovering breakout Roblox YouTube Shorts,
tracking viral momentum, and reverse-engineering successful videos scene by scene.
Ships pointed at `roblox` over a rolling 7-day window.

**Live:** https://mahshid-aghania.github.io/youtube-grow/

No framework, no bundler, no runtime dependencies — plain ES modules the browser
loads directly, so the production build is a file copy and the page stays fast.

The [design brief](docs/design-brief.md) that specified this interface is kept
in the repo alongside it.

## Pages and routing

Seven pages, each with its own address, each a real file on disk:

| URL | Page |
| --- | --- |
| `/youtube-grow/` | Overview — executive summary |
| `/youtube-grow/for-you/` | For You — the weekly production planner |
| `/youtube-grow/top-shorts/` | Top Shorts by views |
| `/youtube-grow/trending/` | Trending Now — views per hour |
| `/youtube-grow/top-channels/` | Top Channels |
| `/youtube-grow/breakout-videos/` | Breakout Videos |
| `/youtube-grow/shot-analyzer/` | Shot Analyzer |

**There is no client-side router.** `npm run build` writes one directory per
route, each holding a complete `index.html`, so `/youtube-grow/trending/` is a
static file that GitHub Pages serves directly. A direct visit, a refresh, a
shared link and the back button are all ordinary browser navigation — there is
no history-API fallback that can 404 in production while working locally, and
no `404.html` redirect trick.

Sidebar links are plain anchors carrying `target="_blank"` and
`rel="noopener noreferrer"`, so **a click opens the destination in a new tab**
and the current tab stays put. Nothing calls `window.open`, which is what keeps
middle-click, the context menu, "copy link address" and keyboard activation
behaving exactly as the browser intends. The link for the page you are already
on has no `target` — it will not open a duplicate of itself — and is marked
`aria-current="page"`. Every other link carries an "Open *X* in a new tab"
accessible name and an "Opens this workspace in a new tab" tooltip, so the small
arrow icon never has to carry that meaning alone.

## Interface

| Layer | File | Role |
| --- | --- | --- |
| Route table | `src/routes.js` | Every page's path, title, description and icon — one source of truth |
| Page shell | `src/shell.js` | The document, sidebar and metadata, rendered once per route at build time |
| Page bodies | `src/pages/*.html` | What goes inside `<main>` for each page |
| Page modules | `src/pages/*.js` | One controller per page, imported on demand |
| Entry point | `src/app.js` | Wires the shell, then loads the module named by `<body data-page>` |
| Design system | `src/styles.css` | Tokens (colour, radii, spacing, motion) and every component class |
| Shared UI | `src/ui.js` | Icons, states, cards, the sortable table, cell renderers, the bar chart |
| Data loading | `src/data.js` | Fetch and memoise the snapshot, the report and the shot lists |
| Shell behaviour | `src/nav.js` | The mobile drawer and the dataset status strip |
| Presentation logic | `src/insights.js` | Overview metrics and grounded observations |
| Formatting | `src/format.js` | One implementation per number, duration and date format |
| Analysis | `src/shorts.js`, `src/shotlist.js` | Unchanged business logic |
| Weekly planner | `src/foryou.js`, `src/planner/` | The For You workspace and the engine behind it |

The shell exists once. Adding a page means one row in `src/routes.js`, one body
fragment in `src/pages/`, and one module — no HTML is copied between pages.

Each page loads only what it needs: the Shot Analyzer never fetches the
snapshot, and only For You reads the shot lists. Page modules are imported
dynamically, so opening Trending Now does not download the planner.

Tables sort, filter and expand; below 760px they become stacked cards rather
than a horizontally scrolling grid.

### State across tabs

Opening workspaces in separate tabs means several copies of the application
share one browser. They share their storage too:

| Key | Holds |
| --- | --- |
| `shorts-intelligence:planner` | Preferences, the week, locks, edits, saved characters, production statuses |
| `shorts-intelligence:recent-analyses` | The last six videos analysed |

Both listen for the `storage` event, which fires only in the *other* tabs of the
origin. Save a character or lock a field in one tab and every other open planner
updates immediately, without a reload. A planner with its workspace drawer open
refreshes the board behind it but leaves the drawer alone — replacing the markup
under someone's cursor would lose their caret.

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
| `scripts/build.js` | Renders one page per route and copies `src/` and `data/` into `public/` |
| `src/pages/` | A body fragment and a controller module for each of the seven pages |
| `data/roblox-shorts.json` | Committed snapshot — the site works with no API key |
| `src/planner/` | The For You engine: signals, recommendations, characters, story, prompts, storage, export |
| `src/planner/robloxstyle.js` | How a Roblox frame is built — rigs, construction rules, render presets |
| `src/planner/games.js` | Roblox game worlds and their known characters |
| `test/` | Unit tests on Node's built-in runner — no dependencies, no network |
| `public/` | Build output — every file is generated; nothing here is hand-written |
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

## For You — the weekly planner

`For You` turns the tracked window into a seven-day production plan: one Short
per day, each with a full package — concept, cast, storyboard, image prompts,
image-to-video prompts, an audio and editing guide, and a publishing kit.

It runs entirely in the browser. There is no API key, no server and no private
endpoint; a static GitHub Pages deployment is the whole product.

### How a week is chosen

```
snapshot + shot lists ──▶ signals.js   what the window actually contains
                                       (themes, keywords, duration bands,
                                        the fastest-moving quarter by views/hr)
                              │
                              ▼
                          recommend.js  seven strategic slots, one per day,
                                        each filled by the best-supported pillar
                                        not already used this week
                              │
                              ▼
                          plan.js       assembles the day: cast → story →
                                        scenes → prompts → audio → publishing
```

Seven slots run in a deliberate order — proven theme, comparison, recurring
character, comedy, emotional story, proven format, experimental. The experiment
is last on purpose, so a format test never takes the week's highest-attention
slot.

Every recommendation carries the evidence behind it, at one of three levels:

| Level | Meaning |
| --- | --- |
| Data-supported | The format matches at least three tracked Shorts, including one in the fastest-moving quarter |
| Pattern-inspired | The format is present in the window, but too thinly to lean on |
| Experimental | Nothing in the window matches it — a deliberate test, labelled as one |

**This is rule-based pattern matching, not AI, and the interface says so.** There
is no model, no confidence score and no prediction. Generation is deterministic:
the same week, preferences and variant always produce the same plan, so a reload
never silently rewrites your week. `Regenerate` steps the concept to the next
seed for that pillar and cycles back after a full round.

### Making it look like Roblox

A prompt that says "premium cinematic 3D animation, expressive faces" produces a
Pixar render, not a Roblox scene — generators have no idea what Roblox looks like
unless the geometry is spelled out. `planner/robloxstyle.js` spells it out, and
every image prompt leads with it, before the scene:

- **Avatar construction** per rig — R6 classic, R15, Rthro, or an animal rig with
  a moulded head. Each names the parts, the joints and the proportions.
- **Seven rules** that apply to any Roblox frame: the face is a flat decal
  printed on the head, not sculpted; hair is a rigid accessory, not strands;
  every surface is flat matte plastic; cloth never drapes; the environment is
  built from parts on a grid.
- **A render treatment** — in-game screenshot, cinematic, or animated short.
  Only the lighting changes; the geometry is fixed either way.
- **Negatives** that stop the drift back: *not Pixar style*, *no sculpted facial
  features*, *no individual hair strands*, *no skin texture or pores*.

Characters are described in the same vocabulary. A cast member has a head part
and a printed face decal, a hair accessory and either a printed shirt or a
layered solid — never "a soft jaw and hazel eyes". Describing an avatar in human
terms is exactly what produced a human.

The rig follows the game world the pillar is set in, so an Animal Hospital plan
gets animal-headed avatars and an obby plan does not. Pinning **Avatar rig** in
strategy preferences overrides it.

### Game characters

Concepts are staged in places that exist — the Animal Hospital treatment room,
an obby checkpoint over the void, a Roblox town street — rather than in "a bright
examination room". `planner/games.js` holds those worlds and the characters that
live in them.

Casting one is a click in the Character bible. **Dr. Harlow** — the Animal
Hospital's head doctor, the player's mentor and supervisor, who appears at the
end of each of the first six shifts, is found afterwards in the lobby and the
Supplies Shop, grades each shift with a performance report and brings bonuses in
emergencies — leads the cast, takes the story's senior-vet slot instead of
duplicating it, and carries the same identity lock every generated character
does.

These are existing characters from other people's games, and the code says so:
each entry records the game it belongs to and what it does there, and every
prompt built from one asks for **a fan interpretation** rather than a copy of the
official asset. The generated cast stays entirely original; a game character is
opted into, per day.

#### Build sheets

A library entry can carry a full **build sheet** — a sectioned description
written against a reference image (head and face, antlers, mask, proportions,
outfit, stethoscope, hands and briefcase, materials, colour lock). Where one
exists it is reproduced verbatim, not paraphrased: the point of a character sheet
is that it does not drift, and a summary of a lock is not a lock. Every scene
prompt that has the character in frame prints the whole sheet, followed by that
character's own **permanent identity lock**, which is used in place of the
generated one.

A sheet also carries its own negative list, which is far stricter than the shared
one — *no visible mouth*, *no missing antlers*, *no suitcase in the wrong hand*,
*no ordinary brown suitcase* — and those ride along in both the image and video
prompts, but only in scenes the character actually appears in.

#### What casting one changes

A game character is not a costume on the same plan — the whole package follows:

| | With no guest | With Dr. Harlow cast |
| --- | --- | --- |
| Cast | generated vet, intern, patient | he leads and takes the vet's slot |
| Storyboard | "the vet arrives to find it handled" | he arrives, looks over the shift and hands across the performance report |
| Dialogue | the seed's line | "Shift report. You did better than you think." |
| On-screen text | the seed's caption | `SHIFT REPORT` |
| Image prompts | summary description | the full nine-section build sheet |
| Video prompts | identity lock only | the same build sheet, so the clip matches the still |
| Titles | premise and conflict | a title led by his name, recommended over the rest |
| Caption | "Part of an animal hospital series" | "Dr. Harlow from Animal Hospital. Part of an…" |
| Hashtags | pillar tags | plus `#drharlow` and `#animalhospital` |

The story change comes from the character's own `storyBeat` — the moment they are
known for, folded into the beat it belongs to. Dr. Harlow's is the end of a
shift, so it lands on the payoff; a seed that already ends on the senior vet
arriving gets a shorter form so he does not arrive twice.

Seeds are written before anyone is cast, so they say "the vet arrives". Each role
now lists the phrases a seed uses for it, and the scene builder swaps them for
the name of whoever is playing that role — so the storyboard reads "Dr. Harlow
arrives", never "the vet".

#### The reference sheet

Every character with a build sheet gets a **Copy reference sheet prompt** button.
That produces a one-off full-body, front-on render on a plain background —
different framing rules from a scene, so it is built separately rather than bent
out of a scene prompt. Generate it once and attach the resulting image alongside
every scene prompt: supplying a reference image is what actually holds a
character steady between separately generated frames, more reliably than text
alone.

### Character consistency

Image and video generators have no memory between calls, so a prompt that says
"the same character as before" produces a different character. `characters.js`
builds each cast member from a fixed archetype pool and compiles an **identity
lock** — a single sentence naming build, face, eyes, hair, outfit, footwear,
accessories, signature colours and distinguishing marks. Every image prompt and
every video prompt repeats that lock in full. The repetition is the mechanism.

Characters you save are reused across the week and win over generated ones, so a
recurring lead stays the same person from Monday to Friday.

### Scripts

Each concept seed carries authored dialogue and on-screen captions, one entry per
story beat, in the script table at the foot of `pillars.js`. Spoken lines are
words a character says on camera; captions are the literal text burned in during
editing; the stage direction is a third, separate field. A beat that spans more
than one scene speaks once, on its first scene — so no line and no caption is
ever used twice in the same video. An empty line is a deliberate silence, and the
video prompt turns it into an explicit "keep the mouth closed" instruction.

### Storage

Your week lives in `localStorage` under `shorts-intelligence:planner`, versioned
(`SCHEMA_VERSION`) with forward migration; an unrecognised version resets rather
than half-loading. Nothing leaves the browser. Reads and writes never throw, so a
private window or full quota degrades to an unsaved session instead of a blank
page.

Persisted per day: status, locks, edits, regeneration variant and scene marks —
plus your strategy preferences and saved characters for the week as a whole.
Locking a field snapshots its current value, and regeneration leaves locked
fields alone. Resetting or overwriting a whole week asks first.

### Exports

| Format | Scope |
| --- | --- |
| Markdown | One day, or the whole week |
| JSON | The whole week, structured |
| Copy to clipboard | Full plan, image prompts, video prompts, character bible |
| Print / PDF | The browser's own print path, with a print stylesheet |

### What it will not do

It will not promise virality, predict views, invent a percentage change, or name a
copyrighted track — music is described as a style brief. Concept seeds are
original premises written against structural patterns; none reproduces a specific
video or names a real creator, avatar or branded character, and the test suite
enforces that.

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

The suite covers the report analysis, the API-response mapping, the shape of the
committed snapshot itself, the whole For You planner — timeline arithmetic across
every runtime and scene count, regeneration and lock behaviour, storage
migration, export completeness, and the content rules above — and the routing
layer: that every route resolves to the right URL from every page, that each
page marks only itself current, and that new-tab links carry the right `rel` and
accessible name. 142 tests, no network, no API key needed.

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
