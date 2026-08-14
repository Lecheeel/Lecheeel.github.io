# Lecheeel.github.io — Project Guide

Personal website of Lecheeel — Astro 7 + Tailwind 4, deployed via GitHub
Pages + GitHub Actions.

## Principles (read before changing anything)

1. **Bleeding edge, always.** This site intentionally runs the newest
   stable versions of everything — framework, tooling, actions. Follow the
   latest, migrate early, keep Dependabot and auto-merge enabled.
2. **Understated.** No tech-stack badges, no emoji salads, no
   "Hi, I'm X 👋" heroes. Restraint is the brand.
3. **Natural voice.** Homepage/README: short lowercase sentences, like a
   person wrote them.
4. **Signals over claims.** Concrete nouns (oklch, pnpm) and insider
   phrases, never adjectives like "expert".
5. **Content is the proof.** Blog posts and projects carry the substance.
6. **Specificity.** Lists must contain real items, no filler.

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
  pubDate, tags (`draft: true` hides). Honest tone, no hype; Chinese is
  fine.
- Projects: `src/content/projects/*.md` (`featured: true` → homepage).
- Single pages: `src/content/pages/*.md` (now, uses).

## Development

Start the dev server in background mode: `astro dev --background`.
Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.

Docs: https://docs.astro.build
