# Lecheeel.github.io — Project Guide

Personal website of Lecheeel. Static site built with Astro 7 + Tailwind CSS 4,
deployed to GitHub Pages via GitHub Actions (workflow mode).

## Design Philosophy (read before changing anything)

This site has a deliberate personality. Preserve it.

1. **Understated, not flashy.** No tech-stack badges, no emoji salads, no
   "Hi, I'm X 👋" hero templates, no decorative gradients. Restraint is the
   brand.
2. **Natural voice, lowercase.** Homepage and README speak in short,
   lowercase, plain sentences ("hi! i'm lecheeel.", "this site ships itself
   — i just push."). It should read like a person wrote it, not a marketing
   page.
3. **Signals over claims.** Show competence with concrete nouns (oklch,
   pnpm, github actions) and insider phrases ("boring tech, interesting
   problems"), never with adjectives ("expert", "passionate").
   Insider-recognizable, outsider-plain.
4. **Content is the proof.** Blog posts and the projects page carry the
   substance. The homepage stays quiet.
5. **Boring tech, interesting problems.** Prefer stable, well-known tools.
   Novelty belongs in content, not in the stack.
6. **Specificity.** Lists ("things i believe in", "things i like") must
   contain real, concrete items. No filler.
7. **Write things down.** This file exists because of this belief.

## Architecture Decisions (do not casually revert)

- **Astro 7** — static output only. No server runtime.
- **View transitions**: import `{ ClientRouter }` from `astro:transitions`.
  Astro 7 renamed `ViewTransitions` → `ClientRouter`; do NOT reintroduce the
  old name.
- **Tailwind CSS 4** — CSS-first: `@import "tailwindcss"` in
  `src/styles/global.css`, `@theme` tokens, `@custom-variant dark` for
  class-based dark mode. No `tailwind.config.js`.
- **Content Layer API** — `src/content.config.ts` with `glob` loaders
  (collections: blog, projects, pages). Zod schemas validate frontmatter.
- **Theme system** — anti-FOUC inline script on first paint; module script
  listens to `astro:page-load` and re-applies the theme on every
  client-side navigation (the router swap resets the `dark` class
  otherwise). Theme toggle uses event delegation on `#theme-toggle`. Keep
  this pattern.
- **Dark mode** — class-based (`dark` class on `<html>`), remembers user
  choice in localStorage, falls back to `prefers-color-scheme`.

## Deployment & Automation

- **GitHub Pages workflow mode**: `.github/workflows/pages.yml` builds with
  pnpm, deploys via `actions/deploy-pages`. PRs build-verify only; deploy
  runs on main push (`if: github.event_name == 'push'`).
- **Keep dependencies fresh automatically**: `.github/dependabot.yml`
  checks npm daily and GitHub Actions weekly;
  `.github/workflows/dependabot-auto-merge.yml` auto-merges minor/patch
  updates (CI-green) and labels major updates `major-update` for human
  review. Do not disable these; do not manually pin versions Dependabot
  manages.
- **pnpm** is the package manager (declared in `package.json`
  `packageManager`).

## Content Guide

- Blog posts: `src/content/blog/*.md`, frontmatter: title, description,
  pubDate, tags (`draft: true` hides). Chinese is fine for posts; keep the
  tone honest and specific, no hype.
- Projects: `src/content/projects/*.md` (`featured: true` shows on
  homepage).
- Single pages: `src/content/pages/*.md` (now, uses).
- New routes: `src/pages/`; layouts in `src/layouts/`; components in
  `src/components/`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
