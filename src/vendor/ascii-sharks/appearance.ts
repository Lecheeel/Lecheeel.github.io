import type { SharkKind } from './world';

export type RenderOptions = {
  palette?: 'grayscale' | 'muted' | 'ocean' | 'custom';
  primaryColor?: string; secondaryColor?: string;
  style?: 'classic' | 'typewriter' | 'dots' | 'blocks';
  cellScale?: number; glyphScale?: number; surfaceOpacity?: number; gridOpacity?: number; wakeStrength?: number;
};
export type SharkPalette = { tint: [number, number, number]; accents: string[] };
const MUTED: Record<SharkKind, string> = {
  classic: '#89949c', hammerhead: '#8d9b8a', greathammer: '#859c9f',
  tiger: '#a09582', zebra: '#aaa38c', mako: '#9491a6', thresher: '#a18e9a', nurse: '#a18f87',
};
const OCEAN: Record<SharkKind, string> = {
  classic: '#649eb5', hammerhead: '#6baf9e', greathammer: '#66b5c2',
  tiger: '#ba9b70', zebra: '#b6b27d', mako: '#8c91bf', thresher: '#a886b4', nurse: '#b98e85',
};
function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function hex(rgb: number[]): string { return '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }

export function paletteFor(kind: SharkKind, options: RenderOptions): SharkPalette {
  if (!options.palette || options.palette === 'grayscale') return { tint: [0.94, 0.94, 0.94], accents: ['#949494', '#b0b0b0', '#757575'] };
  let color = options.palette === 'muted' ? MUTED[kind] : OCEAN[kind];
  if (options.palette === 'custom') {
    const primary = rgb(options.primaryColor || '#829599');
    const secondary = rgb(options.secondaryColor || '#b5a88e');
    const order: SharkKind[] = ['classic', 'hammerhead', 'greathammer', 'tiger', 'zebra', 'mako', 'thresher', 'nurse'];
    const t = order.indexOf(kind) / (order.length - 1);
    color = hex(primary.map((v, i) => v * (1 - t) + secondary[i] * t));
  }
  const channels = rgb(color);
  const norm = Math.max(55, channels.reduce((a, b) => a + b, 0) / 3);
  return { tint: channels.map(v => Math.min(1.6, Math.max(0.35, v / norm))) as [number, number, number],
    accents: [color, hex(channels.map(v => v + (255 - v) * 0.2)), hex(channels.map(v => v * 0.8))] };
}

export function glyphSet(style: RenderOptions['style']) {
  switch (style) {
    case 'typewriter': return { body: '.:-=+*#%@', fin: '-:+*', ridge: '#@%', edge: '.:-', light: '.,', mark: '#%@', eye: 'o' };
    case 'dots': return { body: '.:oO08@', fin: '.:o', ridge: 'O8@', edge: '.:', light: '.', mark: 'oO8', eye: 'o' };
    case 'blocks': return { body: '░▒▓█', fin: '░▒▓', ridge: '▓█', edge: '░▒', light: '░', mark: '▓█', eye: '▪' };
    default: return { body: ':;t%SX8#@', fin: '%;tS:', ridge: '@8%', edge: ':;', light: ".',`", mark: '#%@', eye: 'o' };
  }
}
