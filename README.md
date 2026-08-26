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

The workflow passes `enablement: true` to `actions/configure-pages`, so it turns
Pages on itself the first time it runs — no manual setup needed. If you ever need
to check or change it, it lives under **Settings → Pages → Build and deployment**,
where the source should read **GitHub Actions**.
