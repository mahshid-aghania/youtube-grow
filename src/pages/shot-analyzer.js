/**
 * Shot Analyzer — the scene-by-scene teardown workspace.
 *
 * Moved onto its own page unchanged in behaviour, with one addition the page
 * makes worthwhile: a "recently analysed" list, persisted per browser so the
 * workspace remembers where you were between visits and between tabs.
 */

import { longestScene, normaliseShotlist, parseVideoId, sceneRange, timecode } from '../shotlist.js';
import { percent, shortDuration } from '../format.js';
import { loadShotlist, loadShotlistIndex } from '../data.js';
import {
  $, ICON, emptyState, errorState, esc, extLink, thumbUrl,
} from '../ui.js';
import { loadRecents, pushRecent, onRecentsChanged } from '../recents.js';

const HOOK_SECONDS = 3;

/* ---------- view ---------- */

function sceneCard(scene, { longestN, lastN, title }) {
  const isHook = scene.startSec < HOOK_SECONDS;
  const isLongest = scene.n === longestN;
  const isPayoff = scene.n === lastN;

  const classes = ['scene'];
  if (isHook) classes.push('scene--hook');
  else if (isLongest) classes.push('scene--longest');
  else if (isPayoff) classes.push('scene--payoff');

  const tags = [
    isHook && '<span class="scene__tag scene__tag--hook">Hook</span>',
    isLongest && '<span class="scene__tag scene__tag--longest">Longest</span>',
    isPayoff && '<span class="scene__tag scene__tag--payoff">Payoff</span>',
  ].filter(Boolean).join('');

  const approx = !scene.frame.withinScene;
  const frameLabel = approx ? `≈ ${timecode(scene.frame.atSec)}` : timecode(scene.frame.atSec);

  return `
    <article class="${classes.join(' ')}">
      <div class="scene__index">
        <span class="scene__num">${scene.n}</span>
        <span class="scene__rail" aria-hidden="true"></span>
      </div>
      <div class="scene__frame${approx ? ' scene__frame--approx' : ''}">
        <img src="${esc(scene.frame.url)}" width="148" height="83" loading="lazy"
             alt="Still from ${esc(title)} at ${timecode(scene.frame.atSec)}"
             onerror="this.style.visibility='hidden'">
        <span class="scene__frame-time">${frameLabel}${
          approx ? '<span class="sr-only">— frame taken outside this scene</span>' : ''}</span>
      </div>
      <div class="scene__body">
        <div class="scene__meta">
          <span class="scene__time">${sceneRange(scene)}</span>
          <span class="badge-dur">${scene.durationSec}s · ${percent(scene.share)}</span>
          ${tags}
        </div>
        <div class="scene__grid">
          <div class="scene__field">
            <p class="scene__field-label">Character does</p>
            <p class="scene__field-value">${esc(scene.action)}</p>
          </div>
          <div class="scene__field">
            <p class="scene__field-label">Character says</p>
            <p class="scene__field-value scene__field-value--said">${esc(scene.dialogue)}</p>
          </div>
          <div class="scene__field">
            <p class="scene__field-label">Camera</p>
            <p class="scene__field-value">${esc(scene.camera)}</p>
          </div>
        </div>
      </div>
    </article>`;
}

function shotlistView(list) {
  const longest = longestScene(list);
  const lastN = list.scenes[list.scenes.length - 1].n;
  const approxCount = list.scenes.filter((s) => !s.frame.withinScene).length;

  return `
    <div class="card summary">
      <img class="summary__thumb" src="${thumbUrl(list.videoId)}" width="200" height="113"
           alt="Thumbnail for ${esc(list.title)}" onerror="this.style.visibility='hidden'">
      <div class="summary__body">
        <h3 class="summary__title">${extLink(list.url, esc(list.title))}</h3>
        <div class="summary__facts">
          <span class="pill">${esc(list.channel)}</span>
          <span class="pill">${shortDuration(list.durationSeconds)}</span>
          <span class="pill">${list.sceneCount} scenes</span>
          <span class="pill">${list.meanSceneSec}s average</span>
          <span class="pill">Longest scene ${longest.durationSec}s at ${timecode(longest.startSec)}</span>
        </div>
        <div class="summary__hook">
          <p class="summary__hook-label">${ICON.bolt} Hook · first ${list.hook?.seconds ?? HOOK_SECONDS}s</p>
          <p class="summary__hook-text">${esc(list.hook?.why ?? 'No hook analysis recorded for this video.')}</p>
        </div>
      </div>
    </div>

    <div class="timeline">
      ${list.scenes.map((s) => sceneCard(s, { longestN: longest.n, lastN, title: list.title })).join('')}
    </div>

    <details class="disclosure">
      <summary>About the frames — why ${approxCount} of ${list.sceneCount} are marked approximate</summary>
      <div class="disclosure__body">
        <p>YouTube publishes only three stills per video, at roughly a quarter, half and
        three-quarters through, and those are the only per-timestamp images available
        without downloading the file. Each scene shows the nearest one and the time it
        was taken. A dimmed frame marked <strong>≈</strong> falls outside that scene — it
        is the closest available still, not a shot from that scene. A true frame per
        scene would require downloading the video and extracting it.</p>
      </div>
    </details>`;
}

/* ---------- controller ---------- */

export default async function mount() {
  const form = $('#analyzer-form');
  const input = $('#analyzer-input');
  const hint = $('#analyzer-hint');
  const button = $('#analyzer-submit');
  const out = $('#analyzer-out');
  const chips = $('#analyzer-chips');
  const recentsBox = $('#analyzer-recents');
  if (!form || !input || !out) return;

  const index = await loadShotlistIndex();

  const setHint = (text, state = '') => {
    hint.textContent = text;
    hint.dataset.state = state;
    input.setAttribute('aria-invalid', state === 'error' ? 'true' : 'false');
  };

  const setLoading = (on) => {
    button.dataset.loading = String(on);
    button.disabled = on;
  };

  const markActive = (videoId) => {
    for (const chip of document.querySelectorAll('.analyzer [data-id]')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.id === videoId));
    }
  };

  function renderRecents(active) {
    if (!recentsBox) return;
    const recents = loadRecents();
    if (!recents.length) { recentsBox.innerHTML = ''; return; }
    recentsBox.innerHTML = `<span class="analyzer__chips-label">Recently analysed</span>`
      + recents.map((r) => `
        <button type="button" class="chip" data-id="${esc(r.id)}"
                aria-pressed="${String(r.id === active)}" title="${esc(r.title ?? r.id)}">
          <img class="chip__thumb" src="${thumbUrl(r.id)}" alt="" width="32" height="18" loading="lazy"
               onerror="this.style.display='none'">
          ${esc((r.title ?? r.id).slice(0, 34))}
        </button>`).join('');
  }

  async function show(videoId, { focus = true, remember = true } = {}) {
    setLoading(true);
    out.setAttribute('aria-busy', 'true');
    try {
      const raw = await loadShotlist(videoId);

      if (raw === null) {
        out.innerHTML = errorState(
          'No scene analysis for this video yet',
          'Breaking a video into scenes needs a model that can watch it, which this page '
          + 'cannot do on its own. Ask for it to be analysed and it will appear here.');
        setHint('That link is valid, but no analysis has been recorded for it yet.', 'error');
        markActive(null);
        return;
      }

      const list = normaliseShotlist(raw);
      out.innerHTML = shotlistView(list);
      setHint(`Showing ${list.sceneCount} scenes from “${list.title}”.`);
      if (remember) pushRecent({ id: list.videoId, title: list.title });
      renderRecents(videoId);
      markActive(videoId);
      if (focus) out.querySelector('.summary__title a')?.focus({ preventScroll: true });
    } catch (err) {
      out.innerHTML = errorState('Could not load that analysis', `The request failed — ${err.message}.`);
      setHint('Something went wrong loading that analysis.', 'error');
    } finally {
      setLoading(false);
      out.setAttribute('aria-busy', 'false');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const videoId = parseVideoId(input.value);
    if (!videoId) {
      setHint('That does not look like a YouTube link. Paste a youtube.com/shorts, '
        + 'youtube.com/watch or youtu.be URL, or the 11-character video ID.', 'error');
      input.focus();
      return;
    }
    show(videoId);
  });

  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      setHint('Paste a YouTube Shorts link, or pick one of the analysed videos below.');
    }
  });

  // One delegated handler covers both the catalogue chips and the recents list.
  document.querySelector('.analyzer')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-id]');
    if (!chip) return;
    input.value = `https://www.youtube.com/shorts/${chip.dataset.id}`;
    show(chip.dataset.id);
  });

  // Another tab analysing a video updates this list without a reload.
  onRecentsChanged(() => renderRecents(null));

  if (chips && index.videoIds?.length) {
    chips.innerHTML = `<span class="analyzer__chips-label">Analysed videos</span>`
      + index.videoIds.map((id) => `
        <button type="button" class="chip" data-id="${esc(id)}" aria-pressed="false">
          <img class="chip__thumb" src="${thumbUrl(id)}" alt="" width="32" height="18" loading="lazy"
               onerror="this.style.display='none'">
          ${esc(id)}
        </button>`).join('');

    // Resume where this browser left off; otherwise seed with the first
    // analysis so the workspace is never empty on arrival.
    const resume = loadRecents()[0]?.id;
    const start = index.videoIds.includes(resume) ? resume : index.videoIds[0];
    renderRecents(start);
    show(start, { focus: false });
  } else {
    renderRecents(null);
    out.innerHTML = emptyState('No analyses available',
      'No scene breakdowns have been recorded yet.');
  }
}
