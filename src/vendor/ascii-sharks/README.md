# ascii-sharks (vendored)

Source: https://github.com/stackedlol/ascii-sharks
Revision: a0074c16a106f0abc665fe9712ca445f8f98ad8e
Copyright (c) 2026 drewdi. MIT license; full notice in LICENSE.

Adapted TypeScript engine, world, renderer, math and species modules.
Local changes: optional fish population and frame-rate cap, bounded depth for larger sharks,
appearance options for grayscale, muted, ocean and custom palettes; four glyph families;
cell/glyph size, body fill, grid and wake controls. Grayscale remains the default.
Scene settings also include per-species selection/size, speed, interactions and frame limit.
Site scene rosters live in src/components/ocean-scene.ts; each species appears once.
Layout, appearance and lifecycle handling live in AsciiBackground.astro.
No React adapter or build-tool dependencies are included.
The full license also ships at /licenses/ascii-sharks.txt in the built site.
