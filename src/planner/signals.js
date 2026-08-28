/**
 * Analytics-derived signals.
 *
 * Reduces the loaded Shorts snapshot and any shot lists into the handful of
 * measurements the recommendation engine reasons about. Everything here is a
 * count or a statistic over real records — no forecasting, no scoring of
 * hypothetical future videos.
 */

/** Words that carry no topical meaning in a Shorts title. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'of',
  'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'my', 'your', 'his',
  'her', 'its', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'me', 'him', 'them', 'so', 'as', 'by', 'from', 'when', 'what',
  'who', 'how', 'why', 'not', 'no', 'yes', 'do', 'did', 'does', 'got', 'get',
  'new', 'up', 'out', 'now', 'just', 'like', 'part', 'vs', 'ep', 'shorts',
  'short', 'fyp', 'viral', 'trending', 'foryou', 'fypp', 'edit', 'video',
]);

/** Strip hashes and punctuation, split into comparable lowercase tokens. */
export function tokenize(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/#/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

/** The most frequent meaningful words across a set of titles. */
export function keywordCounts(videos, limit = 20) {
  const counts = new Map();
  for (const v of videos) {
    // Count each word once per video, so one keyword-stuffed title cannot
    // dominate the whole vocabulary.
    for (const word of new Set(tokenize(v.title))) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count, share: count / (videos.length || 1) }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}

/**
 * How many videos in the set match each theme's vocabulary.
 *
 * @param {object[]} videos
 * @param {Array<{id: string, label: string, match: string[]}>} themes
 */
export function themeCounts(videos, themes) {
  return themes.map((theme) => {
    const matches = videos.filter((v) => {
      const haystack = `${v.title ?? ''}`.toLowerCase();
      return theme.match.some((needle) => haystack.includes(needle));
    });
    return {
      id: theme.id,
      label: theme.label,
      count: matches.length,
      share: matches.length / (videos.length || 1),
      examples: matches.slice(0, 3).map((v) => ({ id: v.id, title: v.title, channel: v.channel })),
    };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Bucket runtimes so a recommendation can cite a real duration band. */
export function durationBands(videos) {
  const bands = [
    { id: 'micro', label: '6–12s', min: 0, max: 12 },
    { id: 'short', label: '13–20s', min: 13, max: 20 },
    { id: 'mid', label: '21–35s', min: 21, max: 35 },
    { id: 'long', label: '36–60s', min: 36, max: 60 },
  ];
  return bands.map((b) => {
    const inBand = videos.filter((v) => v.durationSec >= b.min && v.durationSec <= b.max);
    return { ...b, count: inBand.length, share: inBand.length / (videos.length || 1) };
  });
}

/** The band holding the most videos. Null when there is nothing to measure. */
export function leadingBand(videos) {
  const bands = durationBands(videos).filter((b) => b.count > 0);
  if (bands.length === 0) return null;
  return bands.reduce((a, b) => (b.count > a.count ? b : a));
}

/** Median of a numeric array; 0 when empty. */
function median(values) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

/**
 * Structural statistics from whatever shot lists are on file.
 *
 * These are the only measurements of *internal* video structure available, so
 * a recommendation that cites scene pacing must come from here.
 */
export function sceneSignals(shotlists) {
  if (!Array.isArray(shotlists) || shotlists.length === 0) {
    return { available: false, sampleSize: 0 };
  }
  const sceneCounts = shotlists.map((s) => s.scenes.length);
  const sceneDurations = shotlists.flatMap((s) => s.scenes.map((sc) => sc.durationSec));
  const openings = shotlists.map((s) => s.scenes[0]?.durationSec ?? 0);
  const finals = shotlists.map((s) => {
    const last = s.scenes[s.scenes.length - 1];
    return s.durationSeconds > 0 ? last.durationSec / s.durationSeconds : 0;
  });

  return {
    available: true,
    sampleSize: shotlists.length,
    medianSceneCount: median(sceneCounts),
    medianSceneSec: Math.round(median(sceneDurations) * 10) / 10,
    medianOpeningSec: Math.round(median(openings) * 10) / 10,
    medianPayoffShare: Math.round(median(finals) * 1000) / 10,
  };
}

/**
 * Everything the recommender reads, in one object.
 *
 * @param {object[]} videos   videos already filtered to the window
 * @param {object[]} shotlists normalised shot lists, possibly empty
 * @param {Array} themes      the pillar vocabulary to match against
 */
export function buildSignals(videos, shotlists, themes) {
  const byVph = [...videos].sort((a, b) => b.vph - a.vph);
  const momentum = byVph.slice(0, Math.max(1, Math.ceil(videos.length * 0.25)));

  return {
    sampleSize: videos.length,
    keywords: keywordCounts(videos),
    themes: themeCounts(videos, themes),
    momentumThemes: themeCounts(momentum, themes),
    bands: durationBands(videos),
    leadingBand: leadingBand(videos),
    momentumBand: leadingBand(momentum),
    scenes: sceneSignals(shotlists),
    momentumSampleSize: momentum.length,
  };
}
