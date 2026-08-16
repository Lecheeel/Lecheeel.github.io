# Lecheeel.github.io — Project Guide

Personal website of Lecheeel — a static site that ships itself. Astro +
GitHub Pages + GitHub Actions.

## Principles (read before changing anything)

1. **Bleeding edge, always.** This site intentionally runs the newest
   stable versions of everything — framework, tooling, actions. Follow the
   latest, migrate early, keep Dependabot and auto-merge enabled.
2. **Understated.** No tech-stack badges, no "powered by" footers, no
   emoji salads, no "Hi, I'm X 👋" heroes. Restraint is the brand. The
   audience is people who know — flexing the stack is how you lose them.
3. **English only.** All visible content is English. No translations, no
   mixed-language pages. (`<html lang="en">`.)
4. **Natural voice.** Homepage/README/blog: short lowercase sentences,
   like a person wrote them. Never marketing voice, never tutorial voice.
5. **Signals over claims.** Concrete nouns (oklch, pnpm, 1.6GB) and
   insider specifics, never adjectives like "expert" or "passionate".
6. **Content is the proof.** Blog posts and projects carry the substance.
   No self-promotion; let the writing do it.
7. **Information density > volume.** Posts exist because something
   surprised the author: a bug, a decision, a number. No tutorials, no
   hot takes, no filler.
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
