/**
 * "For You" — weekly planning and production workspace.
 *
 * Renders the planner modules; it computes nothing itself. State lives in
 * localStorage via planner/storage.js and plans are rebuilt from templates on
 * every load, so this file only wires interaction to those pure functions.
 */

import { isShort, withinWindow } from './shorts.js';
import { normaliseShotlist } from './shotlist.js';
import { buildSignals } from './planner/signals.js';
import { THEMES, PILLARS, pillarById } from './planner/pillars.js';
import { recommendWeek, DAY_NAMES, addDays } from './planner/recommend.js';
import { buildDayPlan, PRODUCTION_STATUSES, LOCKABLE } from './planner/plan.js';
import { IMAGE_PLATFORM_OPTIONS, VIDEO_PLATFORM_OPTIONS } from './planner/prompts.js';
import { RIG_OPTIONS, RENDER_OPTIONS } from './planner/robloxstyle.js';
import {
  GAME_CHARACTERS, gameCharacterById, gameCharactersForPillar, referenceSheetPrompt,
} from './planner/games.js';
import {
  loadState, saveState, clearState, dayRecord, setDay, variantMap, DEFAULT_PREFS, STORAGE_KEY,
} from './planner/storage.js';
import {
  dayMarkdown, weekMarkdown, weekJson, castMarkdown, imagePromptsText, videoPromptsText,
} from './planner/export.js';
import { compactNumber } from './format.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- module state ---------- */

const store = (() => {
  try { return window.localStorage; } catch { return null; }
})();

let state = loadState(store);
let signals = null;
let week = [];
let openDay = null;
let openTab = 'strategy';

const persist = () => { saveState(store, state); };

/* ---------- week start ---------- */

/** The most recent occurrence of the preferred start day, in UTC. */
function defaultWeekStart(prefs) {
  const target = DAY_NAMES.indexOf(prefs.weekStartDay);
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  const back = (dow - (target < 0 ? 6 : target) + 7) % 7;
  return addDays(iso, -back);
}

const currentWeekStart = () => state.weekStart || defaultWeekStart(state.prefs);

/* ---------- small components ---------- */

const SUPPORT_TONE = {
  'data-supported': 'emerald',
  'pattern-inspired': 'cyan',
  experimental: 'violet',
};

const supportPill = (support) => `
  <span class="pill" style="color: var(--${SUPPORT_TONE[support.level]}); border-color: color-mix(in srgb, var(--${SUPPORT_TONE[support.level]}) 40%, transparent)"
        title="${esc(support.evidence)}">${esc(support.label)}</span>`;

const statusSelect = (iso, status) => `
  <label class="sr-only" for="status-${iso}">Production status for ${iso}</label>
  <select class="input plan-status" id="status-${iso}" data-status-for="${iso}">
    ${PRODUCTION_STATUSES.map((s) => `
      <option value="${s.id}"${s.id === status ? ' selected' : ''}>${s.label}</option>`).join('')}
  </select>`;

const copyBtn = (label, key, extra = '') => `
  <button type="button" class="btn btn--ghost btn--sm" data-copy="${key}"${extra}>${esc(label)}</button>`;

/* ---------- strategy panel ---------- */

const TONES = ['Family-friendly', 'Warm', 'Comedic', 'Suspenseful', 'Wholesome'];

function strategyPanel() {
  const p = state.prefs;
  const field = (id, label, control, hint = '') => `
    <div class="pref">
      <label class="pref__label" for="${id}">${esc(label)}</label>
      ${control}
      ${hint ? `<p class="pref__hint">${esc(hint)}</p>` : ''}
    </div>`;

  const select = (id, value, options) => `
    <select class="input" id="${id}" data-pref="${id}">
      ${options.map((o) => `<option value="${esc(o.id ?? o)}"${(o.id ?? o) === value ? ' selected' : ''}>${esc(o.label ?? o)}</option>`).join('')}
    </select>`;

  return `
    <details class="prefs card" id="prefs-panel"${state.prefsOpen ? ' open' : ''}>
      <summary class="prefs__summary">
        <span>Strategy preferences</span>
        <span class="prefs__hint">Week starts ${esc(p.weekStartDay)} · ${p.postingDays.length} posting days ·
          ${esc(p.durationMode === 'fixed' ? `${p.durationSec}s` : 'duration from data')} ·
          ${esc(p.dialogue ? 'with dialogue' : 'no dialogue')}</span>
      </summary>
      <div class="prefs__grid">
        ${field('weekStart', 'Week start date',
          `<input class="input" id="weekStart" type="date" value="${esc(currentWeekStart())}">`)}
        ${field('weekStartDay', 'Week starts on', select('weekStartDay', p.weekStartDay, DAY_NAMES))}
        ${field('perDay', 'Shorts per day',
          `<input class="input" id="perDay" type="number" min="1" max="3" value="${p.perDay}" data-pref="perDay">`,
          'Each day plans one complete Short; higher values repeat the day\'s concept.')}
        ${field('niche', 'Primary niche',
          `<input class="input" id="niche" type="text" value="${esc(p.niche)}" data-pref="niche">`)}
        ${field('audience', 'Target audience',
          `<input class="input" id="audience" type="text" value="${esc(p.audience)}" data-pref="audience"
                  placeholder="Leave blank to use the pillar's default">`)}
        ${field('tone', 'Emotional tone', select('tone', p.tone, TONES))}
        ${field('durationMode', 'Video duration', select('durationMode', p.durationMode, [
          { id: 'auto', label: 'From the data' }, { id: 'fixed', label: 'Fixed length' }]))}
        ${field('durationSec', 'Fixed length (seconds)',
          `<input class="input" id="durationSec" type="number" min="6" max="60" value="${p.durationSec}" data-pref="durationSec">`,
          'Used only when duration is set to "Fixed length".')}
        ${field('dialogue', 'Dialogue', select('dialogue', p.dialogue ? 'yes' : 'no', [
          { id: 'yes', label: 'With dialogue' }, { id: 'no', label: 'No dialogue — visual only' }]))}
        ${field('avatarRig', 'Avatar rig',
          select('avatarRig', p.avatarRig, [{ id: 'auto', label: 'Match the game' }, ...RIG_OPTIONS]),
          'How characters are built. "Match the game" follows the pillar — an animal rig for '
          + 'Animal Hospital, R15 for most others.')}
        ${field('renderStyle', 'Render look',
          select('renderStyle', p.renderStyle, RENDER_OPTIONS),
          'Only the lighting and grading change. The blocky Roblox geometry is fixed either way.')}
        ${field('imagePlatform', 'Image generator', select('imagePlatform', p.imagePlatform, IMAGE_PLATFORM_OPTIONS))}
        ${field('videoPlatform', 'Image-to-video tool', select('videoPlatform', p.videoPlatform, VIDEO_PLATFORM_OPTIONS))}
        ${field('aspect', 'Aspect ratio', select('aspect', p.aspect, ['9:16', '1:1', '16:9']))}
        ${field('language', 'Language',
          `<input class="input" id="language" type="text" value="${esc(p.language)}" data-pref="language">`)}
        ${field('avoid', 'Topics to avoid',
          `<input class="input" id="avoid" type="text" value="${esc(p.avoid)}" data-pref="avoid"
                  placeholder="Comma separated">`)}

        <div class="pref pref--wide">
          <span class="pref__label">Preferred posting days</span>
          <div class="chips">
            ${DAY_NAMES.map((d) => `
              <button type="button" class="chip" data-day-toggle="${d}"
                      aria-pressed="${p.postingDays.includes(d)}">${d.slice(0, 3)}</button>`).join('')}
          </div>
        </div>

        <div class="pref pref--wide">
          <span class="pref__label">Content pillars</span>
          <p class="pref__hint">Leave all off to let the engine choose from every pillar.</p>
          <div class="chips">
            ${PILLARS.map((pl) => `
              <button type="button" class="chip" data-pillar-toggle="${pl.id}"
                      aria-pressed="${p.pillars.includes(pl.id)}">${esc(pl.label)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="prefs__actions">
        <button type="button" class="btn btn--ghost btn--sm" id="prefs-reset">Reset preferences</button>
        <button type="button" class="btn btn--ghost btn--sm" id="week-reset">Clear this week</button>
      </div>
    </details>`;
}

/* ---------- day card ---------- */

function dayCard(plan, rec) {
  const s = plan.strategy;
  return `
    <article class="daycard" data-day="${plan.date}" data-status="${plan.status}">
      <header class="daycard__head">
        <div>
          <p class="daycard__day">${esc(plan.dayName)}</p>
          <p class="daycard__date">${esc(plan.date)}</p>
        </div>
        <span class="pill pillar-badge" style="--tone: var(--${pillarTone(s.pillarId)})">${esc(s.pillarLabel)}</span>
      </header>

      <p class="daycard__concept">${esc(plan.story.premise)}</p>

      <div class="daycard__facts">
        <span class="pill">${esc(s.emotion)}</span>
        <span class="pill">${s.durationSec}s</span>
        <span class="pill">${s.sceneCount} scenes</span>
        <span class="pill">${esc(s.difficulty)}</span>
        <span class="pill">~${Math.round(s.productionMinutes / 5) * 5} min</span>
      </div>

      <div class="daycard__hook">
        <p class="daycard__hook-label">Hook · first 3s</p>
        <p class="daycard__hook-text">${esc(plan.story.conflict)}</p>
        ${plan.scenes[0]?.dialogue && plan.scenes[0].dialogue !== '—'
          ? `<p class="daycard__hook-line">“${esc(plan.scenes[0].dialogue)}”</p>` : ''}
      </div>

      <div class="daycard__why">
        ${supportPill(s.support)}
        <p class="daycard__why-text">${esc(rec.rationale)}</p>
      </div>

      <div class="daycard__actions">
        <button type="button" class="btn btn--primary btn--sm" data-open-day="${plan.date}">View production plan</button>
        <button type="button" class="btn btn--ghost btn--sm" data-regen="${plan.date}">Regenerate</button>
        ${statusSelect(plan.date, plan.status)}
      </div>
    </article>`;
}

const pillarTone = (id) => ({
  'animal-hospital': 'cyan', 'tiny-rescue': 'emerald', comparison: 'amber',
  'troll-prank': 'red', 'family-comedy': 'violet', transformation: 'emerald',
  'hide-and-seek': 'cyan', challenge: 'amber', mystery: 'violet', experimental: 'red',
}[id] ?? 'border-strong');

/* ---------- workspace tabs ---------- */

const TABS = [
  { id: 'strategy', label: 'Strategy' },
  { id: 'story', label: 'Story' },
  { id: 'cast', label: 'Character bible' },
  { id: 'scenes', label: 'Storyboard' },
  { id: 'images', label: 'Image prompts' },
  { id: 'videos', label: 'Video prompts' },
  { id: 'audio', label: 'Audio & editing' },
  { id: 'publish', label: 'Publishing' },
];

const kv = (label, value) => value
  ? `<div class="kv"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>` : '';

function tabStrategy(plan) {
  const s = plan.strategy;
  return `
    <div class="ws-note">${supportPill(s.support)}<p>${esc(s.support.evidence)}</p></div>
    <dl class="kvgrid">
      ${kv('Content pillar', s.pillarLabel)}
      ${kv('Week slot', s.slot.label)}
      ${kv('Objective', s.objective)}
      ${kv('Target viewer', s.audience)}
      ${kv('Intended emotion', s.emotion)}
      ${kv('Duration', `${s.durationSec}s`)}
      ${kv('Duration basis', s.durationBasis)}
      ${kv('Scenes', String(s.sceneCount))}
      ${kv('Difficulty', s.difficulty)}
      ${kv('Hook type', s.hookType)}
      ${kv('Retention mechanism', s.retention)}
      ${kv('Midpoint escalation', s.midpoint)}
      ${kv('Final payoff', s.payoff)}
      ${kv('Loop strategy', s.loop)}
      ${kv('Why this day', s.whyThisDay)}
    </dl>
    <div class="ws-callout">
      <h4>What makes this idea likely to hold attention?</h4>
      <p>${esc(s.whyItHolds)}</p>
    </div>`;
}

function tabStory(plan) {
  const total = plan.strategy.durationSec;
  return `
    <dl class="kvgrid">
      ${kv('Premise', plan.story.premise)}
      ${kv('Conflict', plan.story.conflict)}
      ${kv('Escalation', plan.story.escalation)}
      ${kv('Turn', plan.story.turn)}
      ${kv('Payoff', plan.story.payoff)}
      ${kv('Loop', plan.story.loop)}
      ${kv('Setting', plan.story.setting)}
      ${kv('Props', plan.story.props.join(', '))}
    </dl>
    <h4 class="ws-h">Timeline — ${total}s total</h4>
    <ol class="beatline">
      ${plan.story.timeline.map((t) => `
        <li class="beat">
          <span class="beat__time">${t.start}s–${t.end}s</span>
          <span class="beat__bar" style="width:${(((t.end - t.start) / total) * 100).toFixed(1)}%"></span>
          <span class="beat__label">${esc(t.label)}</span>
        </li>`).join('')}
    </ol>`;
}

/**
 * Cast an existing game character.
 *
 * Suggestions for this pillar's own game come first — casting Dr. Harlow in an
 * Animal Hospital video is the obvious move, and it should take one click — but
 * the whole library stays available, because a crossover is a legitimate idea.
 */
function gamecastPicker(plan) {
  const cast = new Set(plan.cast.filter((c) => c.fromGame).map((c) => c.id));
  const suggested = gameCharactersForPillar(plan.strategy.pillarId).filter((c) => !cast.has(c.id));
  const others = GAME_CHARACTERS.filter((c) => !cast.has(c.id) && !suggested.includes(c));
  if (!suggested.length && !others.length) return '';

  const chip = (c, isSuggested) => `
    <button type="button" class="chip chip--add" data-add-game="${esc(c.id)}"
            title="${esc(c.lore)}">
      <span aria-hidden="true">+</span> ${esc(c.name)}
      <span class="chip__sub">${esc(c.gameLabel)}${isSuggested ? ' · fits this pillar' : ''}</span>
    </button>`;

  return `
    <div class="gamecast">
      <p class="gamecast__label">Cast a character from the game</p>
      <p class="gamecast__hint">Recognisable characters your audience already knows. They lead the
        cast, keep their own look across every scene, and are prompted as a fan interpretation
        rather than as the official asset.</p>
      <div class="gamecast__chips">
        ${suggested.map((c) => chip(c, true)).join('')}
        ${others.map((c) => chip(c, false)).join('')}
      </div>
    </div>`;
}

function tabCast(plan) {
  return `
    <div class="ws-actions">${copyBtn('Copy character bible', 'cast')}</div>
    ${gamecastPicker(plan)}
    ${plan.cast.map((c) => `
      <article class="charcard">
        <header class="charcard__head">
          <div>
            <h4>${esc(c.name)}</h4>
            <p class="charcard__role">${esc(c.storyRole)} · ${esc(c.archetype)}</p>
          </div>
          <div class="charcard__actions">
            ${c.fromGame ? `<span class="pill pill--violet">${esc(c.fromGame)}</span>` : ''}
            ${c.reused ? '<span class="pill">Reused</span>' : ''}
            ${c.fromGame
              ? `<button type="button" class="btn btn--ghost btn--sm" data-drop-game="${esc(c.id)}">Remove from cast</button>`
              : `<button type="button" class="btn btn--ghost btn--sm" data-save-char="${esc(c.roleKey)}">
                   ${c.reused ? 'Update saved' : 'Save character'}
                 </button>
                 ${c.reused ? `<button type="button" class="btn btn--ghost btn--sm" data-drop-char="${esc(c.roleKey)}">Stop reusing</button>` : ''}`}
          </div>
        </header>
        ${c.lore ? `<div class="charcard__lore">
          <p class="charcard__lore-label">In the game</p>
          <p>${esc(c.lore)}</p>
          <p class="charcard__note">${esc(c.usageNote)}</p>
        </div>` : ''}
        ${c.spec ? `<details class="buildsheet">
          <summary>Build sheet — ${c.spec.length} sections, printed in full in every prompt</summary>
          <div class="buildsheet__body">
            ${c.spec.map(([title, lines]) => `
              <div class="buildsheet__section">
                <h5>${esc(title)}</h5>
                <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
              </div>`).join('')}
          </div>
        </details>
        <div class="lockbox">
          <p class="lockbox__label">Character reference sheet — generate this first</p>
          <p class="lockbox__hint">One full-body, front-on render on a plain background. Generate
            it once, then attach the resulting image alongside every scene prompt — supplying a
            reference image is what actually holds a character steady between separately
            generated frames.</p>
          ${copyBtn('Copy reference sheet prompt', `refsheet:${c.id}`)}
        </div>` : ''}
        <dl class="kvgrid kvgrid--tight">
          ${kv('Age', c.ageCategory)} ${kv('Personality', c.personality)}
          ${kv('Avatar build', c.build)} ${kv('Head', c.head)}
          ${kv('Printed face', c.faceDecal)} ${kv('Headwear', c.hat)}
          ${kv('Hair accessory', c.hair)} ${kv('Outfit', c.outfit)}
          ${kv('Footwear', c.shoes)} ${kv('Accessories', c.accessories)}
          ${kv('Signature colours', c.colors)} ${kv('Distinguishing feature', c.marks)}
          ${kv('Material', c.material)} ${kv('Expressions', c.expressions)}
          ${kv('Body language', c.body)} ${kv('Relative height', c.heightNote)}
          ${kv('Must never change', c.mustNotChange.join('; '))}
          ${kv('May change', c.mayChange.join('; '))}
          ${kv('Negative constraints', c.negatives.join(', '))}
        </dl>
        <div class="lockbox">
          <p class="lockbox__label">Character identity lock — paste into every prompt</p>
          <pre class="promptbox">${esc(c.identityLock)}</pre>
          ${copyBtn('Copy identity lock', `lock:${c.roleKey}`)}
        </div>
      </article>`).join('')}`;
}

function tabScenes(plan) {
  return plan.scenes.map((s) => `
    <article class="scenecard">
      <header class="scenecard__head">
        <span class="scenecard__n">${s.n}</span>
        <span class="scenecard__time">${s.startSec}s–${s.endSec}s · ${s.durationSec}s</span>
        <span class="pill">${esc(s.beatLabel)}</span>
        <span class="scenecard__marks">
          <label class="mark"><input type="checkbox" data-mark="generated" data-scene="${s.n}"${s.generated ? ' checked' : ''}> Generated</label>
          <label class="mark"><input type="checkbox" data-mark="animated" data-scene="${s.n}"${s.animated ? ' checked' : ''}> Animated</label>
        </span>
      </header>
      <dl class="kvgrid kvgrid--tight">
        ${kv('Purpose', s.purpose)} ${kv('Location', s.location)}
        ${kv('Characters', s.characters.join(', '))} ${kv('Position', s.position)}
        ${kv('Action', s.action)} ${kv('Expression', s.expression)}
        ${kv('Background', s.backgroundAction)} ${kv('Dialogue', s.dialogue)}
        ${kv('On-screen text', s.onScreenText)} ${kv('Framing', s.framing)}
        ${kv('Angle', s.angle)} ${kv('Camera movement', s.movement)}
        ${kv('Lighting', s.lighting)} ${kv('Sound', s.sfx)} ${kv('Music', s.music)}
        ${kv('Transition', s.transition)} ${kv('Continuity', s.continuity)}
        ${kv('Retention purpose', s.retention)}
      </dl>
    </article>`).join('');
}

const promptTab = (plan, key) => `
  <div class="ws-actions">
    ${copyBtn(key === 'imagePrompt' ? 'Copy all image prompts' : 'Copy all video prompts',
      key === 'imagePrompt' ? 'all-images' : 'all-videos')}
  </div>
  ${plan.scenes.map((s) => `
    <article class="promptcard">
      <header class="promptcard__head">
        <span class="scenecard__n">${s.n}</span>
        <span class="scenecard__time">${s.startSec}s–${s.endSec}s · ${s.durationSec}s · ${esc(s.beatLabel)}</span>
        ${copyBtn('Copy prompt', `${key}:${s.n}`)}
      </header>
      <pre class="promptbox">${esc(s[key])}</pre>
    </article>`).join('')}`;

function tabAudio(plan) {
  const a = plan.audio;
  return `
    <dl class="kvgrid">
      ${kv('Voiceover', a.voiceover)}
      ${kv('Caption style', a.captionStyle)}
      ${kv('Music brief', a.musicMood)}
      ${kv('Music level', a.musicVolume)}
      ${kv('Final frame', a.finalFrame)}
      ${kv('Loop', a.loop)}
    </dl>
    ${a.dialogue.length ? `
      <h4 class="ws-h">Dialogue timing</h4>
      <ul class="tightlist">
        ${a.dialogue.map((d) => `<li><strong>Scene ${d.scene}</strong> at ${esc(d.at)} (${esc(d.window)}) — “${esc(d.line)}”<br><span class="muted">${esc(d.note)}</span></li>`).join('')}
      </ul>` : '<p class="muted">No dialogue — this plan is set to visual-only storytelling.</p>'}
    <h4 class="ws-h">Captions</h4>
    <ul class="tightlist">
      ${a.captions.map((c) => `<li><strong>Scene ${c.scene}</strong> at ${esc(c.at)} — “${esc(c.text)}”${c.emphasis ? ` <span class="muted">(emphasise “${esc(c.emphasis)}”)</span>` : ''}</li>`).join('')}
    </ul>
    <h4 class="ws-h">Sound cues</h4>
    <ul class="tightlist">
      ${a.soundEffects.map((s) => `<li><strong>Scene ${s.scene}</strong> at ${esc(s.at)} — ${esc(s.cue)}</li>`).join('')}
    </ul>
    <h4 class="ws-h">Cuts and emphasis</h4>
    <ul class="tightlist">
      ${a.transitions.map((t) => `<li><strong>Scene ${t.scene}</strong> at ${esc(t.at)} — ${esc(t.cut)}</li>`).join('')}
      ${a.punchIns.map((p) => `<li><strong>Punch-in</strong> at ${esc(p.at)} — ${esc(p.note)}</li>`).join('')}
      ${a.patternInterrupts.map((p) => `<li><strong>Pattern interrupt</strong> at ${esc(p.at)} — ${esc(p.note)}</li>`).join('')}
    </ul>`;
}

function tabPublish(plan, record) {
  const p = plan.publishing;
  return `
    <h4 class="ws-h">Title options</h4>
    <ul class="tightlist">
      ${p.titles.map((t) => `<li><span class="muted">${esc(t.style)}:</span> ${esc(t.text)}</li>`).join('')}
    </ul>
    <div class="editfield">
      <label class="pref__label" for="edit-title">Recommended title</label>
      <input class="input" id="edit-title" data-edit="title" value="${esc(p.recommendedTitle)}">
    </div>
    <div class="editfield">
      <label class="pref__label" for="edit-caption">Short caption</label>
      <input class="input" id="edit-caption" data-edit="caption" value="${esc(p.shortCaption)}">
    </div>
    <div class="editfield">
      <label class="pref__label" for="edit-long">Long caption</label>
      <textarea class="input" id="edit-long" rows="4" readonly>${esc(p.longCaption)}</textarea>
    </div>
    <div class="editfield">
      <label class="pref__label" for="edit-tags">Hashtags</label>
      <input class="input" id="edit-tags" data-edit="hashtags" value="${esc(p.hashtags.join(' '))}">
    </div>
    <dl class="kvgrid">
      ${kv('Thumbnail frame', p.thumbnailFrame)}
      ${kv('Thumbnail text', p.thumbnailText)}
    </dl>
    <div class="editfield">
      <label class="pref__label" for="edit-time">Publishing time</label>
      <input class="input" id="edit-time" type="time" data-edit="publishTime" value="${esc(record.edits.publishTime ?? '')}">
      <p class="pref__hint">${esc(p.publishTime.note)}</p>
    </div>
    <h4 class="ws-h">Pre-publish checklist</h4>
    <ul class="checklist">
      ${p.checklist.map((c, i) => `
        <li><label class="mark"><input type="checkbox" data-check="${i}"> ${esc(c)}</label></li>`).join('')}
    </ul>`;
}

/* ---------- workspace ---------- */

function workspace(plan, rec, record) {
  const body = {
    strategy: () => tabStrategy(plan),
    story: () => tabStory(plan),
    cast: () => tabCast(plan),
    scenes: () => tabScenes(plan),
    images: () => promptTab(plan, 'imagePrompt'),
    videos: () => promptTab(plan, 'videoPrompt'),
    audio: () => tabAudio(plan),
    publish: () => tabPublish(plan, record),
  }[openTab]();

  return `
    <div class="ws__head">
      <div>
        <p class="ws__eyebrow">${esc(plan.dayName)} · ${esc(plan.date)} · ${esc(plan.strategy.slot.label)}</p>
        <h3 id="ws-title">${esc(plan.strategy.pillarLabel)} — ${esc(plan.story.premise)}</h3>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" id="ws-close" aria-label="Close production plan">Close</button>
    </div>

    <div class="ws__toolbar">
      ${statusSelect(plan.date, plan.status)}
      <div class="ws__locks">
        <span class="pref__label">Lock before regenerating:</span>
        ${LOCKABLE.map((f) => `
          <button type="button" class="chip chip--sm" data-lock="${f}"
                  aria-pressed="${record.locks.includes(f)}">${f}</button>`).join('')}
      </div>
      <div class="ws__exports">
        <button type="button" class="btn btn--ghost btn--sm" data-regen="${plan.date}">Regenerate</button>
        ${copyBtn('Copy full plan', 'day')}
        <button type="button" class="btn btn--ghost btn--sm" data-export="md">Markdown</button>
        <button type="button" class="btn btn--ghost btn--sm" data-export="json">JSON</button>
        <button type="button" class="btn btn--ghost btn--sm" data-export="print">Print / PDF</button>
      </div>
    </div>

    <div class="ws__tabs" role="tablist" aria-label="Production plan sections">
      ${TABS.map((t) => `
        <button type="button" class="ws__tab" role="tab" data-tab="${t.id}"
                aria-selected="${t.id === openTab}" tabindex="${t.id === openTab ? '0' : '-1'}">
          ${esc(t.label)}
        </button>`).join('')}
    </div>

    <div class="ws__body" role="tabpanel" tabindex="0" aria-label="${esc(TABS.find((t) => t.id === openTab).label)}">
      ${body}
    </div>`;
}

/* ---------- rendering ---------- */

function currentWeek() {
  return recommendWeek(signals, state.prefs, {
    weekStart: currentWeekStart(),
    variants: variantMap(state),
  });
}

function planFor(rec) {
  const record = dayRecord(state, rec.date);
  return buildDayPlan(rec, state.prefs, {
    edits: record.edits,
    locks: record.locks,
    status: record.status,
    sceneMarks: record.sceneMarks,
    gameCharacters: record.gameCharacters,
    savedCharacters: state.characters,
  });
}

/**
 * Redraw the board, the summary and — unless told otherwise — the open drawer.
 *
 * `keepDrawer` exists for the cross-tab listener: replacing the workspace's
 * markup while someone is typing in it would lose their caret and their
 * selection, so a change arriving from another tab refreshes the board behind
 * the drawer and leaves the drawer itself alone until it is reopened.
 */
function render({ keepDrawer = false } = {}) {
  week = currentWeek();
  const plans = week.map(planFor);

  $('#foryou-prefs').innerHTML = strategyPanel();
  $('#foryou-board').innerHTML = plans.length
    ? plans.map((p, i) => dayCard(p, week[i])).join('')
    : `<div class="state"><p class="state__title">No posting days selected</p>
         <p class="state__body">Turn on at least one day in strategy preferences to build a week.</p></div>`;

  $('#foryou-summary').innerHTML = summaryStrip(plans);

  const drawer = $('#foryou-ws');
  if (keepDrawer && openDay) return;
  if (openDay) {
    const i = week.findIndex((r) => r.date === openDay);
    if (i >= 0) {
      drawer.innerHTML = workspace(plans[i], week[i], dayRecord(state, openDay));
      drawer.dataset.open = 'true';
      $('#foryou-scrim').dataset.open = 'true';
    } else { closeWorkspace(); }
  } else {
    drawer.dataset.open = 'false';
    $('#foryou-scrim').dataset.open = 'false';
  }
}

function summaryStrip(plans) {
  const minutes = plans.reduce((t, p) => t + p.strategy.productionMinutes, 0);
  const levels = plans.reduce((acc, p) => {
    acc[p.strategy.support.level] = (acc[p.strategy.support.level] ?? 0) + 1;
    return acc;
  }, {});
  const done = plans.filter((p) => ['ready', 'scheduled', 'published'].includes(p.status)).length;

  return `
    <span class="pill">${plans.length} planned Shorts</span>
    <span class="pill">${plans.reduce((t, p) => t + p.strategy.sceneCount, 0)} scenes total</span>
    <span class="pill">~${Math.round(minutes / 60)}h production</span>
    <span class="pill" style="color: var(--emerald)">${levels['data-supported'] ?? 0} data-supported</span>
    <span class="pill" style="color: var(--cyan)">${levels['pattern-inspired'] ?? 0} pattern-inspired</span>
    <span class="pill" style="color: var(--violet)">${levels.experimental ?? 0} experimental</span>
    <span class="pill">${done}/${plans.length} ready or beyond</span>`;
}

function closeWorkspace() {
  openDay = null;
  $('#foryou-ws').dataset.open = 'false';
  $('#foryou-scrim').dataset.open = 'false';
}

/* ---------- clipboard and downloads ---------- */

async function copyText(text, button) {
  const original = button?.textContent;
  try {
    await navigator.clipboard.writeText(text);
    if (button) { button.textContent = 'Copied'; setTimeout(() => { button.textContent = original; }, 1400); }
  } catch {
    if (button) { button.textContent = 'Press Ctrl+C'; setTimeout(() => { button.textContent = original; }, 2000); }
  }
}

function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ---------- events ---------- */

function onPrefChange(target) {
  const p = { ...state.prefs };
  const id = target.id;

  if (id === 'weekStart') { state.weekStart = target.value || null; }
  else if (id === 'dialogue') { p.dialogue = target.value === 'yes'; }
  else if (id === 'perDay' || id === 'durationSec') { p[id] = Number(target.value) || DEFAULT_PREFS[id]; }
  else if (id in p) { p[id] = target.value; }

  state = { ...state, prefs: p, prefsOpen: true };
  persist();
  render();
  $('#prefs-panel')?.setAttribute('open', '');
}

function wire() {
  const root = $('#foryou');

  // Cross-tab sync. `storage` fires only in the *other* tabs of this origin, so
  // saving a character or locking a field in one tab updates every other open
  // planner immediately rather than at the next reload.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = loadState(store);
    render({ keepDrawer: true });
  });

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-pref], #weekStart')) { onPrefChange(t); return; }

    if (t.matches('[data-status-for]')) {
      state = setDay(state, t.dataset.statusFor, { status: t.value });
      persist(); render(); return;
    }
    if (t.matches('[data-mark]') && openDay) {
      const rec = dayRecord(state, openDay);
      const n = t.dataset.scene;
      const marks = { ...rec.sceneMarks, [n]: { ...(rec.sceneMarks[n] ?? {}), [t.dataset.mark]: t.checked } };
      state = setDay(state, openDay, { sceneMarks: marks });
      persist(); return;                       // no re-render: keep the scroll position
    }
    if (t.matches('[data-edit]') && openDay) {
      saveEdit(t);
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-edit]') && openDay) saveEdit(e.target);
  });

  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;

    if (t.dataset.dayToggle) {
      const day = t.dataset.dayToggle;
      const days = state.prefs.postingDays.includes(day)
        ? state.prefs.postingDays.filter((d) => d !== day)
        : [...state.prefs.postingDays, day];
      state = { ...state, prefs: { ...state.prefs, postingDays: days }, prefsOpen: true };
      persist(); render(); $('#prefs-panel')?.setAttribute('open', ''); return;
    }

    if (t.dataset.pillarToggle) {
      const id = t.dataset.pillarToggle;
      const list = state.prefs.pillars.includes(id)
        ? state.prefs.pillars.filter((p) => p !== id)
        : [...state.prefs.pillars, id];
      state = { ...state, prefs: { ...state.prefs, pillars: list }, prefsOpen: true };
      persist(); render(); $('#prefs-panel')?.setAttribute('open', ''); return;
    }

    if (t.id === 'prefs-reset') {
      state = { ...state, prefs: { ...DEFAULT_PREFS }, prefsOpen: true };
      persist(); render(); return;
    }

    if (t.id === 'week-reset') {
      if (!confirm('Clear this week? Saved characters are kept, but every edit, lock, status and '
        + 'regenerated concept for this week will be discarded. This cannot be undone.')) return;
      state = { ...state, days: {}, weekStart: null };
      persist(); closeWorkspace(); render(); return;
    }

    if (t.dataset.openDay) { openDay = t.dataset.openDay; openTab = 'strategy'; render(); $('#ws-close')?.focus(); return; }
    if (t.id === 'ws-close') { const back = openDay; closeWorkspace(); render();
      document.querySelector(`[data-open-day="${back}"]`)?.focus(); return; }

    if (t.dataset.regen) {
      const iso = t.dataset.regen;
      const rec = dayRecord(state, iso);
      state = setDay(state, iso, { variant: rec.variant + 1 });
      persist(); render(); return;
    }

    if (t.dataset.tab) { openTab = t.dataset.tab; render(); $('.ws__body')?.focus(); return; }

    if (t.dataset.lock && openDay) { toggleLock(t.dataset.lock); return; }

    if (t.dataset.saveChar && openDay) { saveCharacter(t.dataset.saveChar); return; }
    if (t.dataset.dropChar) {
      const chars = { ...state.characters }; delete chars[t.dataset.dropChar];
      state = { ...state, characters: chars }; persist(); render(); return;
    }

    // Casting a game character is stored per day, so one day can feature
    // Dr. Harlow without every other day inheriting him.
    if (t.dataset.addGame && openDay) {
      const current = dayRecord(state, openDay).gameCharacters ?? [];
      if (!current.includes(t.dataset.addGame)) {
        state = setDay(state, openDay, { gameCharacters: [...current, t.dataset.addGame] });
        persist();
      }
      render(); return;
    }
    if (t.dataset.dropGame && openDay) {
      const current = dayRecord(state, openDay).gameCharacters ?? [];
      state = setDay(state, openDay, {
        gameCharacters: current.filter((id) => id !== t.dataset.dropGame),
      });
      persist(); render(); return;
    }

    if (t.dataset.copy) { await handleCopy(t); return; }
    if (t.dataset.export) { handleExport(t.dataset.export); }
  });

  // Escape closes the workspace.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openDay) { const back = openDay; closeWorkspace(); render();
      document.querySelector(`[data-open-day="${back}"]`)?.focus(); }
  });

  $('#foryou-scrim').addEventListener('click', () => { closeWorkspace(); render(); });
}

/**
 * Locking a field snapshots its current value into the day's edits, and
 * unlocking removes that snapshot.
 *
 * The snapshot is what actually survives regeneration: the recommender re-rolls
 * the concept regardless, and buildDayPlan prefers an edit over the generated
 * value. Without it a lock would be decorative.
 */
function toggleLock(field) {
  const record = dayRecord(state, openDay);
  const i = week.findIndex((r) => r.date === openDay);
  if (i < 0) return;
  const plan = planFor(week[i]);

  const edits = { ...record.edits };
  const locks = record.locks.includes(field)
    ? record.locks.filter((l) => l !== field)
    : [...record.locks, field];

  const nowLocked = locks.includes(field);
  const snapshot = {
    story: () => ({ seed: week[i].seed }),
    cast: () => ({ cast: plan.cast }),
    title: () => ({ title: plan.publishing.recommendedTitle }),
    caption: () => ({ caption: plan.publishing.shortCaption }),
    hashtags: () => ({ hashtags: plan.publishing.hashtags }),
  }[field];

  if (nowLocked && snapshot) Object.assign(edits, snapshot());
  else if (!nowLocked) {
    for (const key of { story: ['seed'], cast: ['cast'], title: ['title'],
                        caption: ['caption'], hashtags: ['hashtags'] }[field] ?? []) {
      delete edits[key];
    }
  }

  state = setDay(state, openDay, { locks, edits });
  persist();
  render();
}

function saveEdit(target) {
  const rec = dayRecord(state, openDay);
  const key = target.dataset.edit;
  const value = key === 'hashtags'
    ? target.value.split(/\s+/).filter(Boolean)
    : target.value;
  state = setDay(state, openDay, { edits: { ...rec.edits, [key]: value } });
  persist();
}

function saveCharacter(roleKey) {
  const i = week.findIndex((r) => r.date === openDay);
  if (i < 0) return;
  const plan = planFor(week[i]);
  const character = plan.cast.find((c) => c.roleKey === roleKey);
  if (!character) return;
  state = { ...state, characters: { ...state.characters, [roleKey]: { ...character, reused: undefined } } };
  persist(); render();
}

async function handleCopy(button) {
  const i = week.findIndex((r) => r.date === openDay);
  if (i < 0) return;
  const plan = planFor(week[i]);
  const key = button.dataset.copy;
  const opts = { platform: state.prefs.imagePlatform, rig: state.prefs.avatarRig === 'auto'
    ? undefined : state.prefs.avatarRig, render: state.prefs.renderStyle, aspect: state.prefs.aspect };

  if (key === 'day') return copyText(dayMarkdown(plan), button);
  if (key === 'cast') return copyText(castMarkdown(plan), button);
  if (key.startsWith('refsheet:')) {
    return copyText(referenceSheetPrompt(gameCharacterById(key.slice(9))), button);
  }
  if (key === 'all-images') return copyText(imagePromptsText(plan, opts), button);
  if (key === 'all-videos') return copyText(videoPromptsText(plan, { platform: state.prefs.videoPlatform }), button);

  const [kind, ref] = key.split(':');
  if (kind === 'lock') {
    const c = plan.cast.find((x) => x.roleKey === ref);
    return copyText(c?.identityLock ?? '', button);
  }
  const scene = plan.scenes.find((s) => String(s.n) === ref);
  if (scene) return copyText(scene[kind], button);
  return undefined;
}

function handleExport(kind) {
  const plans = week.map(planFor);
  const start = currentWeekStart();

  if (kind === 'md') return download(`shorts-plan-${start}.md`, weekMarkdown(plans, start), 'text/markdown');
  if (kind === 'json') return download(`shorts-plan-${start}.json`, weekJson(plans, start, state.prefs), 'application/json');
  if (kind === 'print') { window.print(); return undefined; }
  return undefined;
}

/* ---------- boot ---------- */

/**
 * Mount the feature.
 *
 * @param {object} snapshot   the raw Shorts snapshot
 * @param {object[]} rawShotlists  shot-list records, possibly empty
 */
export function mountForYou(snapshot, rawShotlists = []) {
  const root = $('#foryou');
  if (!root) return;

  try {
    const videos = withinWindow(snapshot.videos.filter(isShort),
      { start: snapshot.windowStart, end: snapshot.windowEnd });
    const shotlists = rawShotlists.map((r) => {
      try { return normaliseShotlist(r); } catch { return null; }
    }).filter(Boolean);

    signals = buildSignals(videos, shotlists, THEMES);

    $('#foryou-basis').innerHTML = `
      <span class="pill">${compactNumber(signals.sampleSize)} Shorts analysed</span>
      ${signals.scenes.available
        ? `<span class="pill">${signals.scenes.sampleSize} shot lists · median ${signals.scenes.medianSceneSec}s per scene</span>`
        : '<span class="pill">No shot lists on file</span>'}
      ${signals.momentumBand ? `<span class="pill">Momentum band ${esc(signals.momentumBand.label)}</span>` : ''}`;

    wire();
    render();
  } catch (err) {
    root.querySelector('#foryou-board').innerHTML = `
      <div class="state state--error" role="alert">
        <p class="state__title">The planner could not start</p>
        <p class="state__body">${esc(err.message)}</p>
      </div>`;
  }
}

export { pillarById };
