/**
 * Sample growth math for a YouTube channel.
 *
 * Deliberately dependency-free so the test suite runs anywhere Node runs.
 */

/**
 * Project subscriber count forward at a constant compounding growth rate.
 *
 * @param {number} current - Subscribers today. Must be >= 0.
 * @param {number} monthlyRate - Growth per month as a fraction (0.05 = +5%/mo).
 * @param {number} months - Whole months to project forward. Must be >= 0.
 * @returns {number} Projected subscribers, rounded to a whole person.
 */
export function projectSubscribers(current, monthlyRate, months) {
  if (!Number.isFinite(current) || current < 0) {
    throw new RangeError('current must be a non-negative number');
  }
  if (!Number.isFinite(monthlyRate) || monthlyRate <= -1) {
    throw new RangeError('monthlyRate must be greater than -1');
  }
  if (!Number.isInteger(months) || months < 0) {
    throw new RangeError('months must be a non-negative integer');
  }
  return Math.round(current * (1 + monthlyRate) ** months);
}

/**
 * Engagement rate for a video: interactions as a percentage of views.
 *
 * @param {{views: number, likes?: number, comments?: number}} video
 * @returns {number} Percentage, rounded to two decimals. Zero views => 0.
 */
export function engagementRate({ views, likes = 0, comments = 0 }) {
  if (!Number.isFinite(views) || views < 0) {
    throw new RangeError('views must be a non-negative number');
  }
  if (views === 0) return 0;
  return Math.round(((likes + comments) / views) * 10000) / 100;
}

/**
 * Average views per day since publication — a rough "is it still moving?" signal.
 *
 * @param {number} views - Lifetime views.
 * @param {number} daysSincePublish - Days live. Values under 1 are treated as 1.
 * @returns {number} Views per day, rounded to one decimal.
 */
export function viewVelocity(views, daysSincePublish) {
  if (!Number.isFinite(views) || views < 0) {
    throw new RangeError('views must be a non-negative number');
  }
  const days = Math.max(1, daysSincePublish);
  return Math.round((views / days) * 10) / 10;
}

/**
 * Rank videos by view velocity, best first.
 *
 * @param {Array<{title: string, views: number, daysSincePublish: number}>} videos
 * @returns {Array<{title: string, velocity: number}>}
 */
export function topPerformers(videos, limit = 3) {
  return videos
    .map((v) => ({ title: v.title, velocity: viewVelocity(v.views, v.daysSincePublish) }))
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, limit);
}
