# Design brief — Shorts Intelligence

The brief that produced the interface redesign in commit `1a83ab7`
("Redesign the dashboard as Shorts Intelligence"). Kept here so the intent
behind the design system, the section structure and the copy decisions stays
with the code.

Implementation notes and the limits the available YouTube data imposes are in
[`../README.md`](../README.md).

---

You are a senior product designer, UX strategist, data-visualization specialist, and frontend engineer.

Redesign and implement the user interface of this existing project:

- Live website: https://mahshid-aghania.github.io/youtube-grow/
- Repository: https://github.com/mahshid-aghania/youtube-grow

The goal is to transform the current functional dashboard into a highly polished, professional YouTube Shorts intelligence platform that feels like a premium SaaS analytics product.

Do not merely suggest improvements. Inspect the complete repository, understand how the application loads and processes its data, and implement the redesign directly in the existing codebase.

## Core product positioning

Present the application as a focused intelligence dashboard for discovering viral Roblox YouTube Shorts, identifying high-performing channels, measuring current momentum, and reverse-engineering successful videos scene by scene.

Create a concise, professional product identity. Use a name such as:

> "Shorts Intelligence"

Supporting description:

> "Discover breakout Roblox Shorts, track viral momentum, and analyze the creative patterns driving millions of views."

The interface should feel credible, analytical, modern, and creator-focused — not childish, cluttered, or like a generic admin template.

## Critical requirements

- Preserve all existing data, calculations, links, sorting logic, fetching behavior, and shot-list functionality.
- Do not remove or simplify valuable functionality.
- Do not fabricate analytics, timestamps, metrics, thumbnails, or API results.
- Do not break the GitHub Actions deployment workflow.
- Preserve compatibility with GitHub Pages and the `/youtube-grow/` base path.
- Work within the existing framework and architecture unless a change is clearly justified.
- Reuse the existing dependencies where practical.
- Do not expose API keys, secrets, tokens, or private configuration.
- The finished application must work after a clean installation and production build.
- Use reusable components and a maintainable design system rather than scattered one-off styles.

## Design direction

Create a sophisticated dark analytics interface influenced by the clarity and polish of Linear, Vercel, YouTube Studio, Stripe Dashboard, and modern creator-economy SaaS products. Do not directly copy any of those products.

Use:

- Deep charcoal or near-black application background
- Slightly lighter elevated surfaces
- Crisp white primary typography
- Cool gray secondary typography
- YouTube red as a restrained primary accent
- Violet, cyan, emerald, and amber accents for metric categories
- Subtle borders instead of excessive shadows
- Soft gradients only where they improve hierarchy
- Consistent 12–16px corner radii
- Strong spacing and alignment
- Smooth, restrained transitions
- Clear typography optimized for dense analytical information

Avoid:

- Excessive glassmorphism
- Neon overload
- Heavy glowing effects
- Oversized gradients
- Tiny text
- Decorative clutter
- Generic stock photos
- Cartoonish Roblox styling
- Excessive animation
- An interface composed entirely of large tables

## Application shell

Build a professional application structure with a sidebar or compact desktop navigation. Include:

- Product logo and "Shorts Intelligence"
- Overview
- Top Shorts
- Trending Now
- Top Channels
- Breakout Videos
- Shot Analyzer

Highlight the active section as the user scrolls or navigates. The navigation may use anchored sections if the application remains a single page. Do not introduce unnecessary routing.

On mobile, replace the sidebar with a polished compact header and accessible navigation drawer or section menu.

### Top header

Include:

- Page title: "Roblox Shorts Intelligence"
- Short supporting description
- A clear "Last updated" status using real available data
- Data/source status indicator
- Optional refresh action only if it can use the existing refresh behavior truthfully
- Theme treatment consistent with the rest of the dashboard

Replace the current isolated "Deployed from GitHub Actions" badge with a more useful status component. Deployment details may remain available subtly in the footer or status area.

## Executive overview

Before the detailed rankings, add a strong overview area containing summary metric cards derived only from the loaded dataset. Possible metrics include:

- Total Shorts analyzed
- Combined views
- Highest views per hour
- Number of channels analyzed
- Leading video
- Strongest breakout ratio

Each card should include a clear label, a properly formatted value, a small contextual explanation, a relevant icon, and an optional trend or category indicator only when supported by actual data.

Never invent percentage changes or historical trends.

Add a compact "Key Insight" panel that generates a factual, useful observation from the currently loaded dataset, such as identifying the leading video or channel. Keep the insight deterministic and grounded in available values.

## Dashboard organization

Organize the existing content into visually distinct, clearly labeled sections:

1. Top Shorts by Views
2. Fastest Right Now
3. Channels Taking the Most Views
4. Punching Above Their Size
5. Scene-by-Scene Shot Analyzer

Each section must have an eyebrow or category label where useful, a clear title, a one-sentence explanation, a relevant icon, consistent section spacing, purposeful actions or filters, and empty, loading, and error states.

Do not display multiple giant tables with identical styling and no prioritization.

## Data tables

Redesign the existing tables as premium analytical data tables. Add, where technically practical:

- Ranking numbers
- Video thumbnails from existing available data
- Channel avatars only if genuinely available
- Clear separation between video title and metadata
- Compact duration badges
- Subscriber-count formatting
- Right-aligned numerical metrics
- Tabular numerals
- Sortable columns
- Search or filtering
- Desktop sticky table headers
- Row hover states
- Accessible focus states
- Tooltips explaining metrics such as "Views/hr" and "× subs"
- External-link indicator for YouTube destinations
- Sensible title truncation with full text accessible
- Highlighting for the top three results
- Compact pagination or "Show more" behavior if the dataset becomes long

Do not rely on color alone to communicate ranking or status.

Use metric treatments appropriate to the section:

- Views: neutral or red accent
- Views per hour: momentum indicator
- Channel totals: channel-focused treatment
- Breakout multiple: emerald or violet badge

On mobile, tables must not become unreadable. Convert suitable tables into stacked cards or use a carefully designed horizontal-scroll pattern with the identity column remaining easy to understand.

## Optional data visualization

Introduce only a small number of useful, truthful visualizations derived from the existing dataset. Good possibilities:

- Horizontal bar chart for top videos by views
- Compact bar chart for views per hour
- Channel share comparison
- Scatter plot comparing subscribers and views for breakout discovery

Use a chart only if it makes comparison faster than reading the table.

Requirements: use actual application data, responsive sizing, accessible labels or accompanying table information, proper number formatting, useful tooltips, no chart junk, no invented time series, no misleading axes.

If adding a chart library would add excessive weight, implement lightweight CSS/SVG visualization or omit the chart.

## Shot Analyzer redesign

Make the "Scene-by-Scene Shot List" the signature feature of the product. Create a visually prominent analyzer workspace.

### Input area

- Strong title and explanation
- Properly labeled YouTube Shorts URL input
- YouTube icon or recognizable video-link cue
- Clear primary button such as "Analyze Short"
- Disabled, loading, success, invalid-link, unavailable-analysis, and error states
- Keyboard submission
- Accessible validation messages
- Recently analyzed video chips using the existing IDs or data

Do not imply that the tool performs capabilities the backend does not support.

### Selected video summary

Once a video is selected, show the thumbnail, video title, channel, duration, number of scenes, average scene length, hook classification, a direct YouTube link, and a concise explanation of why the opening works, using existing analysis data.

### Scene presentation

On wide screens, redesign the shot list as either a visual timeline connected to detailed scene cards, or a polished analytical table with large readable frames and structured scene information.

Each scene should clearly present the scene number, frame, timestamp or time range, duration, percentage of runtime, character action, spoken dialogue or on-screen text, and camera treatment.

Visually emphasize the first three seconds as the hook, the longest scene, the final payoff, and approximate frames that fall outside the exact scene.

Preserve and improve the explanation about YouTube providing only limited still frames. Move this into a concise, well-designed informational disclosure, tooltip, or expandable note so it does not overwhelm the main analysis.

On mobile, present every scene as a vertical card. Do not force users to read a seven-column table on a narrow screen.

## Interaction design

Add restrained, purposeful interactions: smooth anchor navigation, visible hover and keyboard-focus feedback, animated metric entry only if it does not delay comprehension, subtle card elevation, clear loading skeletons, button loading indicator, sort direction feedback, helpful tooltips, and respect for `prefers-reduced-motion`.

Animations should generally last 150–250ms and must never distract from the data.

## Responsive behavior

Design and test these approximate widths: 1440px desktop, 1024px laptop/tablet landscape, 768px tablet, 390px mobile, 320px narrow mobile.

Requirements:

- No clipped content
- No accidental horizontal page overflow
- Touch targets at least approximately 44px
- Readable typography
- Correct table or card adaptation
- Navigation remains usable
- Charts resize correctly
- Analyzer frames preserve their aspect ratio
- Important actions remain visible
- Long video titles and hashtags wrap or truncate gracefully

## Accessibility

Meet WCAG 2.2 AA principles wherever practical. Include semantic landmarks, a logical heading hierarchy with one clear H1, accessible table headers and captions, proper input labels, keyboard-accessible controls, visible focus indicators, sufficient color contrast, ARIA attributes only where native semantics are insufficient, screen-reader-friendly loading and error feedback, reduced-motion support, meaningful image alternative text, and no color-only meaning.

## Content and microcopy

Improve labels and explanations to sound professional and immediately understandable. For example:

- "Fastest Right Now" can remain, supported by "Videos currently generating the highest estimated views per hour."
- "Punching Above Their Size" can remain, supported by "Videos earning unusually high reach relative to their channel's subscriber base."
- Explain that channels below 1,000 subscribers are excluded without making the explanation visually dominant.
- Replace developer-facing language with creator-facing product language.
- Keep technical refresh instructions and the GitHub source link in a refined footer or developer information panel.

Do not remove important caveats or misrepresent calculated metrics as official real-time YouTube analytics.

## Loading, empty, and error states

The current application initially displays "Loading snapshot…". Replace this with a polished skeleton interface that preserves the page structure while data loads.

Create distinct states for initial loading, successfully loaded data, empty dataset, snapshot load failure, invalid YouTube URL, video unavailable, shot analysis unavailable, and partial data such as a missing thumbnail.

Errors should be helpful and specific without exposing stack traces or implementation details.

## Engineering quality

Before editing:

1. Inspect the full repository structure.
2. Identify the framework, entry points, data source, build system, and GitHub Pages configuration.
3. Understand all current functionality and data transformations.
4. Create a concise implementation plan.
5. Then implement the redesign.

During implementation:

- Build reusable components.
- Centralize design tokens with CSS variables or the existing theme system.
- Preserve existing business logic.
- Avoid unnecessary dependencies.
- Keep components reasonably small.
- Use consistent number, duration, and date formatters.
- Ensure external links are safe.
- Remove obsolete styling only when confirmed unused.
- Do not leave placeholder components, fake buttons, TODO sections, or dead interactions.
- Do not rewrite the entire application if a controlled refactor is safer.

## Performance

- Keep the initial bundle lean.
- Avoid unnecessary rerenders.
- Lazy-load noncritical images where appropriate.
- Define image dimensions to reduce layout shift.
- Optimize thumbnails without reducing clarity.
- Prevent charts or tables from causing layout instability.
- Maintain good Lighthouse performance.
- Avoid blocking fonts or excessive font weights.

Use a high-quality system font stack or one carefully chosen web font with appropriate fallbacks.

## SEO and metadata

Although this is primarily an application dashboard, improve the page title, meta description, Open Graph metadata, theme color, favicon references if assets exist, semantic heading structure, and descriptive link text.

Do not add keyword-stuffed text or unnecessary marketing sections.

## Quality assurance

After implementation:

1. Run the appropriate install, lint, type-check, test, and production-build commands available in the repository.
2. Fix all errors introduced by the redesign.
3. Check the browser console.
4. Test data loading and the shot analyzer.
5. Test all YouTube and GitHub links.
6. Verify desktop, tablet, and mobile layouts.
7. Verify keyboard navigation.
8. Confirm that the GitHub Pages base path works.
9. Confirm that the GitHub Actions deployment remains valid.
10. Review the finished pages visually and refine any awkward spacing, overflow, alignment, or contrast.

## Expected final result

The final interface should immediately answer:

- What is trending?
- Which Short has the greatest reach?
- Which video has the strongest momentum?
- Which channels are capturing the most views?
- Which smaller creators are outperforming their subscriber base?
- How is a successful Short structured scene by scene?

The product should feel intentional, trustworthy, fast, and presentation-ready — something a professional YouTube strategist or creator could comfortably use every day.

At the end, provide a concise summary of the redesign, the most important files changed, any dependencies added and why, verification commands and results, any limitations caused by the available YouTube data, and confirmation that the production build and GitHub Pages deployment configuration remain functional.
