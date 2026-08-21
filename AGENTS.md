# Lecheeel.github.io — Project Guide

Personal website of Lecheeel — a static site that ships itself. Astro +
GitHub Pages + GitHub Actions.

## Principles (read before changing anything)

1. **Bleeding edge, always.** This site intentionally runs the newest
   stable versions of everything — framework, tooling, actions. Follow the
   latest, migrate early, keep Dependabot and auto-merge enabled.
2. **Honest inventory.** Never fabricate personal details (habits,
   tastes, routines) to fill out the site's personality. If something
   isn't real, it doesn't go on the page. No slogans, no aphorism
   endings — posts end with open problems, not quips.
3. **English only.** All visible content is English. No translations, no
   mixed-language pages. (`<html lang="en">`.)
4. **Research-note voice.** Normal sentence case. First person is fine,
   performance is not. Numbers over adjectives. Read like an Obsidian
   note written for oneself, not like an indie-blog persona.
5. **Specifics over claims.** Concrete nouns (64 KB cap, 5-minute skew
   window, 1.6 GB RAM, 0.033 CNY/hour) and mechanisms, never adjectives
   like "expert" or "passionate", and never "boring" as a brand word.
6. **Content is the proof.** Blog posts and projects carry the substance.
   No self-promotion; let the writing do it.
7. **Information density > volume.** One thick post beats three thin
   ones. If two posts make the same argument, merge them. Posts exist to
   record a mechanism, a measurement, or a design decision — with the
   open problems at the end.
8. **Typography is detail.** Fonts are a system stack (no webfonts — the
   site should load like a file), antialiased, ligatures on, tabular
   figures for dates. Keep the reading width tight (~max-w-2xl).
9. **Specificity.** Lists must contain real items, no filler.

## Architecture (do not casually revert)

- Astro 7 static output. View transitions: `{ ClientRouter }` from
  `astro:transitions` (NOT `ViewTransitions` — renamed in Astro 7).
- Tailwind 4, CSS-first (`@import "tailwindcss"` in global.css, `@theme`,
  `@custom-variant dark`). No tailwind.config.js.
- Content Layer API: `src/content.config.ts` + `glob` loaders
  (blog / projects / pages).
- Theme: anti-FOUC inline script + `astro:page-load` listener + event
  delegation on `#theme-toggle` (router swap resets the dark class
  otherwise). Keep this pattern.
- Automation: `.github/dependabot.yml` (npm daily, actions weekly);
  `dependabot-auto-merge.yml` auto-merges minor/patch, labels major
  `major-update` for human review. Never disable or pin manually.
- pnpm (declared in package.json `packageManager`).

## Content

- Blog: `src/content/blog/*.md` — frontmatter: title, description,
  pubDate, tags (`draft: true` hides). English only. Write about what
  surprised you; include real numbers; skip the intro paragraphs.
- Projects: `src/content/projects/*.md` (`featured: true` → homepage).
  One honest sentence about what it does and why it exists. Stack field
  stays minimal or empty — no flexing.
- Single pages: `src/content/pages/*.md` (now, uses). Keep them current;
  they're what people check first.

## Development

Start the dev server in background mode: `astro dev --background`.
Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.
Build check before pushing: `pnpm build`.

Docs: https://docs.astro.build
