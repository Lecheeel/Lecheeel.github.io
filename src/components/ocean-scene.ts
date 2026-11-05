import type { SharkSpec } from '../vendor/ascii-sharks/world';

/** Each roster contains each silhouette at most once. Sizes are art direction, not biological scale. */
export const DESKTOP_SHARKS: SharkSpec[] = [
  { kind: 'greathammer', size: 1.12 },
  { kind: 'thresher', size: 1.26 },
  { kind: 'tiger', size: 1.02 },
  { kind: 'zebra', size: 1.08 },
  { kind: 'mako', size: 1.04 },
  { kind: 'nurse', size: 0.92 },
  { kind: 'hammerhead', size: 0.98 },
  { kind: 'classic', size: 1.08 },
];

// Phones use five distinct silhouettes rather than crowding eight into the reading area.
export const MOBILE_SHARKS: SharkSpec[] = [
  { kind: 'greathammer', size: 1.5 },
  { kind: 'thresher', size: 1.7 },
  { kind: 'tiger', size: 1.35 },
  { kind: 'zebra', size: 1.45 },
  { kind: 'mako', size: 1.3 },
];
