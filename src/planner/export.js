/**
 * Export formats.
 *
 * Markdown for pasting into a doc, JSON for tooling, and plain text blocks for
 * the clipboard. Each preserves week, day, story, cast, scene numbers, scene
 * timings, both prompt sets, the audio plan and the publishing package.
 */

import { allImagePrompts, allVideoPrompts } from './prompts.js';

const line = (label, value) => (value ? `**${label}:** ${value}\n` : '');

/** One day as Markdown. */
export function dayMarkdown(plan) {
  const s = plan.strategy;
  const out = [];

  out.push(`# ${plan.dayName} ${plan.date} — ${s.pillarLabel}\n`);
  out.push(`> ${s.support.label}. ${s.support.evidence}\n`);

  out.push('## Strategy\n');
  out.push(line('Content pillar', s.pillarLabel));
  out.push(line('Week slot', s.slot.label));
  out.push(line('Objective', s.objective));
  out.push(line('Target viewer', s.audience));
  out.push(line('Intended emotion', s.emotion));
  out.push(line('Duration', `${s.durationSec}s across ${s.sceneCount} scenes`));
  out.push(line('Duration basis', s.durationBasis));
  out.push(line('Difficulty', s.difficulty));
  out.push(line('Hook type', s.hookType));
  out.push(line('Retention mechanism', s.retention));
  out.push(line('Midpoint escalation', s.midpoint));
  out.push(line('Final payoff', s.payoff));
  out.push(line('Loop strategy', s.loop));
  out.push(line('Why this day', s.whyThisDay));
  out.push(`\n${s.whyItHolds}\n`);

  out.push('\n## Story\n');
  out.push(line('Premise', plan.story.premise));
  out.push(line('Conflict', plan.story.conflict));
  out.push(line('Escalation', plan.story.escalation));
  out.push(line('Turn', plan.story.turn));
  out.push(line('Payoff', plan.story.payoff));
  out.push(line('Loop', plan.story.loop));
  out.push(line('Setting', plan.story.setting));
  out.push(line('Props', plan.story.props.join(', ')));
  out.push('\n### Timeline\n');
  for (const t of plan.story.timeline) {
    out.push(`- ${t.start}s–${t.end}s — ${t.label}\n`);
  }

  out.push('\n## Character bible\n');
  for (const c of plan.cast) {
    out.push(`\n### ${c.name} — ${c.storyRole}\n`);
    out.push(line('Age', c.ageCategory));
    out.push(line('Personality', c.personality));
    out.push(line('Build', c.build));
    out.push(line('Face', c.face));
    out.push(line('Eyes', c.eyes));
    out.push(line('Eyebrows', c.brows));
    out.push(line('Hair', c.hair));
    out.push(line('Outfit', c.outfit));
    out.push(line('Footwear', c.shoes));
    out.push(line('Accessories', c.accessories));
    out.push(line('Signature colours', c.colors));
    out.push(line('Distinguishing feature', c.marks));
    out.push(line('Expressions', c.expressions));
    out.push(line('Body language', c.body));
    out.push(line('Relative height', c.heightNote));
    out.push(line('Must never change', c.mustNotChange.join('; ')));
    out.push(line('May change', c.mayChange.join('; ')));
    out.push(`\n> ${c.identityLock}\n`);
  }

  out.push('\n## Scene storyboard\n');
  for (const sc of plan.scenes) {
    out.push(`\n### Scene ${sc.n} — ${sc.beatLabel} (${sc.startSec}s–${sc.endSec}s, ${sc.durationSec}s)\n`);
    out.push(line('Purpose', sc.purpose));
    out.push(line('Location', sc.location));
    out.push(line('Characters', sc.characters.join(', ')));
    out.push(line('Position', sc.position));
    out.push(line('Action', sc.action));
    out.push(line('Expression', sc.expression));
    out.push(line('Background', sc.backgroundAction));
    out.push(line('Dialogue', sc.dialogue));
    out.push(line('On-screen text', sc.onScreenText));
    out.push(line('Framing', sc.framing));
    out.push(line('Angle', sc.angle));
    out.push(line('Camera movement', sc.movement));
    out.push(line('Lighting', sc.lighting));
    out.push(line('Sound', sc.sfx));
    out.push(line('Music', sc.music));
    out.push(line('Transition', sc.transition));
    out.push(line('Continuity', sc.continuity));
    out.push(line('Retention purpose', sc.retention));
  }

  out.push('\n## Image prompts\n');
  for (const sc of plan.scenes) {
    out.push(`\n### Scene ${sc.n}\n\n\`\`\`\n${sc.imagePrompt}\n\`\`\`\n`);
  }

  out.push('\n## Image-to-video prompts\n');
  for (const sc of plan.scenes) {
    out.push(`\n### Scene ${sc.n}\n\n\`\`\`\n${sc.videoPrompt}\n\`\`\`\n`);
  }

  out.push('\n## Audio and editing\n');
  out.push(line('Voiceover', plan.audio.voiceover));
  out.push(line('Caption style', plan.audio.captionStyle));
  out.push(line('Music', plan.audio.musicMood));
  out.push(line('Music level', plan.audio.musicVolume));
  out.push(line('Final frame', plan.audio.finalFrame));
  out.push(line('Loop', plan.audio.loop));
  if (plan.audio.dialogue.length) {
    out.push('\n### Dialogue timing\n');
    for (const d of plan.audio.dialogue) out.push(`- Scene ${d.scene} at ${d.at} (${d.window}): "${d.line}"\n`);
  }

  out.push('\n## Publishing package\n');
  out.push(line('Recommended title', plan.publishing.recommendedTitle));
  out.push('\n**Title options:**\n');
  for (const t of plan.publishing.titles) out.push(`- ${t.style}: ${t.text}\n`);
  out.push(line('\nShort caption', plan.publishing.shortCaption));
  out.push(`\n**Long caption:**\n\n${plan.publishing.longCaption}\n`);
  out.push(line('\nHashtags', plan.publishing.hashtags.join(' ')));
  out.push(line('Thumbnail frame', plan.publishing.thumbnailFrame));
  out.push(line('Thumbnail text', plan.publishing.thumbnailText));
  out.push(line('Publish time', plan.publishing.publishTime.value || '(not set)'));
  out.push(`\n_${plan.publishing.publishTime.note}_\n`);
  out.push('\n### Pre-publish checklist\n');
  for (const c of plan.publishing.checklist) out.push(`- [ ] ${c}\n`);

  out.push('\n---\n');
  out.push(`_Generated by the ${plan.meta.generatedBy}. Results depend on execution, audience fit, `
    + 'timing, competition and platform distribution._\n');

  return out.join('');
}

/** The whole week as one Markdown document. */
export function weekMarkdown(plans, weekStart) {
  const head = `# Weekly Shorts plan — week of ${weekStart}\n\n`
    + `${plans.length} planned Shorts. Recommendations are data-informed and rule-based, not predictions.\n\n---\n\n`;
  return head + plans.map(dayMarkdown).join('\n---\n\n');
}

/** Structured JSON for tooling. */
export function weekJson(plans, weekStart, prefs) {
  return JSON.stringify({
    schema: 'shorts-intelligence/week-plan',
    version: 1,
    weekStart,
    exportedAt: new Date().toISOString(),
    preferences: prefs,
    days: plans,
  }, null, 2);
}

export function imagePromptsText(plan, opts) {
  return allImagePrompts(plan.scenes, plan.cast, opts);
}

export function videoPromptsText(plan, opts) {
  return allVideoPrompts(plan.scenes, plan.cast, opts);
}

/** The character bible alone. */
export function castMarkdown(plan) {
  const out = [`# Character bible — ${plan.dayName} ${plan.date}\n`];
  for (const c of plan.cast) {
    out.push(`\n## ${c.name} — ${c.storyRole}\n`);
    out.push(`- Age: ${c.ageCategory}\n- Personality: ${c.personality}\n- Build: ${c.build}\n`);
    out.push(`- Face: ${c.face}\n- Eyes: ${c.eyes}\n- Eyebrows: ${c.brows}\n- Hair: ${c.hair}\n`);
    out.push(`- Outfit: ${c.outfit}\n- Footwear: ${c.shoes}\n- Accessories: ${c.accessories}\n`);
    out.push(`- Colours: ${c.colors}\n- Feature: ${c.marks}\n- Height: ${c.heightNote}\n`);
    out.push(`\n${c.identityLock}\n`);
  }
  return out.join('');
}
