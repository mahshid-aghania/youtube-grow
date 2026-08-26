# YouTube Grow

A starter project for YouTube channel growth tooling — with a live deployment and a green test suite from day one.

## What's here

| Path | Purpose |
| --- | --- |
| `src/growth.js` | Sample growth-math module (subscriber projection, engagement rate, view velocity) |
| `test/growth.test.js` | Unit tests using Node's built-in test runner — no dependencies |
| `public/index.html` | Static dashboard page, deployed to GitHub Pages |
| `.github/workflows/ci.yml` | Runs the test suite on every push and pull request |
| `.github/workflows/deploy.yml` | Publishes `public/` to GitHub Pages on every push to `main` |

## Run the tests locally

```bash
npm test          # or: node --test
```

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
