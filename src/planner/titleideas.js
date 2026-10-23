/**
 * Proven title ideas — a curated swipe file for the planner.
 *
 * These titles are written in the viral formats reverse-engineered from the
 * fastest-growing faceless story channels (hidden-wealth reveal, revenge /
 * comeback, Cinderella status-flip, family secret) in the billionaire-romance
 * and betrayal/revenge full-movie drama niche. Each score is vidIQ's
 * click-through-rate rating (0–100), captured once; this module is static data,
 * so the panel renders even when the video snapshot is offline.
 */

import { esc } from '../ui.js';

/** One colour per format, borrowing the palette the topic badges already use. */
const FORMAT_TONE = {
  'Status flip': 'cyan',
  Revenge: 'amber',
  'Hidden-wealth': 'emerald',
  'Family secret': 'violet',
};

/** The vidIQ-scored titles, highest score first. */
export const TITLE_IDEAS = [
  { score: 99, format: 'Status flip', text: 'They Gave Him the Worst Desk in the Office — He Turned It Into the Corner Office 🪑' },
  { score: 98, format: 'Revenge', text: "They Said She'd Never Amount to Anything — So She Made Sure They Watched 🔥" },
  { score: 98, format: 'Revenge', text: 'The Teacher Told Him to Give Up — He Mailed Her His Diploma 🎓' },
  { score: 97, format: 'Hidden-wealth', text: 'She Gave Her Last $5 to a Stranger — The Next Morning Changed Her Life Forever 💵' },
  { score: 97, format: 'Status flip', text: 'Nobody Asked the Shy Intern to Speak — So She Saved the Whole Meeting 🎤' },
  { score: 97, format: 'Status flip', text: 'The Girl Everyone Overlooked Walked In — And the Room Went Silent ✨' },
  { score: 96, format: 'Family secret', text: 'My Grandmother Left Me an Old Locked Box — What Was Inside Broke Me 📦' },
  { score: 96, format: 'Family secret', text: 'He Found a Letter His Dad Never Sent — It Explained Everything 💌' },
  { score: 96, format: 'Family secret', text: 'Dad Always Skipped That One Room — The Day I Opened It, I Understood 🚪' },
  { score: 95, format: 'Status flip', text: "He Delivered Pizza to His Old Bullies' Mansion — Then Bought the House Next Door 🍕" },
  { score: 90, format: 'Family secret', text: "The Stranger at the Funeral Knew My Mother's Real Name 🥀" },
];

/** A copy-to-clipboard button hooks onto this data-title attribute. */
const row = (idea) => {
  const tone = FORMAT_TONE[idea.format] ?? 'border-strong';
  return `
    <li class="titleidea">
      <span class="titleidea__score" aria-label="vidIQ score ${idea.score} of 100">${idea.score}</span>
      <div class="titleidea__body">
        <p class="titleidea__text">${esc(idea.text)}</p>
        <span class="titleidea__tag" style="--tone: var(--${tone})">${esc(idea.format)}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--sm titleidea__copy"
              data-copy-title="${esc(idea.text)}">Copy</button>
    </li>`;
};

/** The full panel markup. */
export function renderTitleIdeas(ideas = TITLE_IDEAS) {
  return `
    <div class="card titleideas">
      <div class="titleideas__head">
        <div>
          <h3 class="titleideas__title">Proven title ideas</h3>
          <p class="titleideas__sub">
            Written in the viral story formats — hidden-wealth reveal, revenge, status-flip,
            family secret — and rated by vidIQ for short-form click-through. Score is out of 100.
          </p>
        </div>
        <span class="pill pill--violet">${ideas.length} titles</span>
      </div>
      <ol class="titleideas__list">${ideas.map(row).join('')}</ol>
    </div>`;
}

/**
 * Wire the copy buttons. Idempotent and self-contained: one delegated listener
 * on the panel, so re-rendering the page does not stack handlers.
 */
export function bindTitleIdeas(root = document) {
  const panel = root.querySelector('.titleideas');
  if (!panel || panel.dataset.bound === 'true') return;
  panel.dataset.bound = 'true';
  panel.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy-title]');
    if (!btn) return;
    const text = btn.dataset.copyTitle;
    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = original; }, 1400);
    } catch {
      // Clipboard denied (insecure context or permissions) — select nothing,
      // just flag it so the click is not silently ignored.
      btn.textContent = 'Copy failed';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
    }
  });
}
