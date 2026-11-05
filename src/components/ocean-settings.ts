import { DESKTOP_SHARKS, MOBILE_SHARKS } from './ocean-scene';
import approvedSettings from './ocean-config.json';
import type { SharkKind, SharkSpec } from '../vendor/ascii-sharks/world';
import type { RenderOptions } from '../vendor/ascii-sharks/appearance';

export type OceanMode = 'desktop' | 'mobile';
export const SHARK_CHOICES: { kind: SharkKind; label: string }[] = [
  { kind: 'classic', label: 'Classic shark' }, { kind: 'hammerhead', label: 'Hammerhead' },
  { kind: 'greathammer', label: 'Great hammerhead' }, { kind: 'tiger', label: 'Tiger shark' },
  { kind: 'zebra', label: 'Zebra shark' }, { kind: 'mako', label: 'Shortfin mako' },
  { kind: 'thresher', label: 'Thresher shark' }, { kind: 'nurse', label: 'Nurse shark' },
];
export const PALETTES = ['grayscale', 'muted', 'ocean', 'custom'] as const;
export const GLYPH_STYLES = ['classic', 'typewriter', 'dots', 'blocks'] as const;
export const LIMITS = {
  opacityLight: [0, 1, 0.01], opacityDark: [0, 1, 0.01],
  scrimOpacity: [0, 1, 0.01], centerVisibility: [0, 1, 0.01],
  size: [0.5, 1.8, 0.05], speed: [0.25, 1.5, 0.05], fishCount: [0, 200, 5],
  cellScale: [0.75, 1.6, 0.05], glyphScale: [0.55, 1.1, 0.01], surfaceOpacity: [0, 1, 0.05],
  gridOpacity: [0, 0.15, 0.005], wakeStrength: [0, 1, 0.05],
  saturation: [0, 1, 0.05], contrast: [0.65, 1.5, 0.05], maxFps: [15, 60, 5],
} as const;
export type NumericSetting = keyof typeof LIMITS;
export type SceneSettings = Record<NumericSetting, number> & {
  colorMode: typeof PALETTES[number]; glyphStyle: typeof GLYPH_STYLES[number];
  primaryColor: string; secondaryColor: string; interactive: boolean;
  species: SharkKind[]; speciesScale: Record<SharkKind, number>;
};
export type OceanSettings = { schemaVersion: 2; desktop: SceneSettings; mobile: SceneSettings };
export const SETTINGS_KEY = 'ocean-tuner-v2';
export const SETTINGS_EVENT = 'ocean:settings-change';
// Approved user export is the single source of production appearance settings.
export const DEFAULTS = approvedSettings as OceanSettings;
const validKind = (kind: unknown): kind is SharkKind => SHARK_CHOICES.some(s => s.kind === kind);
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function normalizeSettings(raw: unknown): OceanSettings {
  const result = structuredClone(DEFAULTS);
  const source = object(raw);
  for (const mode of ['desktop', 'mobile'] as const) {
    const values = object(source[mode]);
    for (const key of Object.keys(LIMITS) as NumericSetting[]) {
      const value = values[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const [min, max, step] = LIMITS[key];
      result[mode][key] = Number((Math.round((clamp(value, min, max) - min) / step) * step + min).toFixed(3));
    }
    if (PALETTES.includes(values.colorMode as SceneSettings['colorMode'])) result[mode].colorMode = values.colorMode as SceneSettings['colorMode'];
    if (GLYPH_STYLES.includes(values.glyphStyle as SceneSettings['glyphStyle'])) result[mode].glyphStyle = values.glyphStyle as SceneSettings['glyphStyle'];
    for (const key of ['primaryColor', 'secondaryColor'] as const) {
      if (typeof values[key] === 'string' && /^#[0-9a-fA-F]{6}$/.test(values[key] as string)) result[mode][key] = (values[key] as string).toLowerCase();
    }
    if (typeof values.interactive === 'boolean') result[mode].interactive = values.interactive;
    if (Array.isArray(values.species)) result[mode].species = [...new Set(values.species.filter(validKind))];
    else if (typeof values.count === 'number' && Number.isFinite(values.count)) {
      // Preserve v1 choices when upgrading the existing preview.
      result[mode].species = baseRoster(mode).slice(0, clamp(Math.round(values.count), 0, 8)).map(s => s.kind);
    }
    const scales = object(values.speciesScale);
    for (const { kind } of SHARK_CHOICES) {
      const value = scales[kind];
      if (typeof value === 'number' && Number.isFinite(value)) result[mode].speciesScale[kind] = Number(clamp(value, 0.5, 2).toFixed(2));
    }
  }
  return result;
}
function baseRoster(mode: OceanMode): SharkSpec[] {
  return mode === 'desktop' ? DESKTOP_SHARKS : [
    ...MOBILE_SHARKS, ...DESKTOP_SHARKS.filter(s => !MOBILE_SHARKS.some(m => m.kind === s.kind)).map(s => ({ ...s, size: 1.25 })),
  ];
}
function readSaved() {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') return normalizeSettings(null);
  try { return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || localStorage.getItem('ocean-tuner-v1') || 'null')); }
  catch { return normalizeSettings(null); }
}
let current = readSaved();
export function getOceanSettings(): OceanSettings { return structuredClone(current); }
export function applyOceanStyles() {
  for (const mode of ['desktop', 'mobile'] as const) {
    const s = current[mode];
    for (const key of ['opacityLight', 'opacityDark', 'scrimOpacity', 'centerVisibility', 'contrast', 'saturation'] as const) {
      document.documentElement.style.setProperty(`--ocean-${mode}-${key}`, String(s[key]));
    }
    document.documentElement.style.setProperty(`--ocean-${mode}-grayscale`, s.colorMode === 'grayscale' ? '1' : '0');
  }
}
export function updateOceanSettings(mode: OceanMode, key: keyof SceneSettings, value: unknown) {
  const next = getOceanSettings();
  const values = next[mode] as unknown as Record<string, unknown>;
  if (!(key in values)) return false;
  values[key] = value;
  current = normalizeSettings(next);
  return publish();
}
export function updateSceneSettings(mode: OceanMode, values: Partial<SceneSettings>) {
  const next = getOceanSettings();
  next[mode] = { ...next[mode], ...values };
  current = normalizeSettings(next);
  return publish();
}
export function resetOceanSettings() { current = normalizeSettings(null); return publish(); }
export function importOceanSettings(raw: unknown) {
  const source = object(raw);
  if (![1, 2].includes(source.schemaVersion as number) || !Object.keys(object(source.desktop)).length || !Object.keys(object(source.mobile)).length) throw new Error('Expected schemaVersion 1 or 2 with desktop and mobile settings.');
  current = normalizeSettings(source);
  return publish();
}
function publish() {
  let saved = true;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(current)); } catch { saved = false; }
  applyOceanStyles();
  document.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  return saved;
}
export function exportOceanSettings() { return JSON.stringify(current, null, 2); }
export function oceanRoster(mode: OceanMode): SharkSpec[] {
  const s = current[mode];
  return s.species.map(kind => {
    const spec = baseRoster(mode).find(x => x.kind === kind)!;
    return { kind, size: spec.size * s.size * s.speciesScale[kind] };
  });
}
export function rendererOptions(s: SceneSettings): RenderOptions {
  return { palette: s.colorMode, primaryColor: s.primaryColor, secondaryColor: s.secondaryColor,
    style: s.glyphStyle, cellScale: s.cellScale, glyphScale: s.glyphScale,
    surfaceOpacity: s.surfaceOpacity, gridOpacity: s.gridOpacity, wakeStrength: s.wakeStrength };
}
export function sceneSignature(s: SceneSettings) {
  return JSON.stringify([s.species, s.speciesScale, s.size, s.speed, s.fishCount, s.maxFps, s.interactive, rendererOptions(s)]);
}

