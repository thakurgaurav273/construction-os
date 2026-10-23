/** Same rule as the backend: links, icons and focus rings must stand out on white. */
export const MIN_BRAND_CONTRAST = 3;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const DARK_BACKGROUND = '#09090B';

interface Hsl { h: number; s: number; l: number }

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];
}

export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const [r, g, b] = rgb(hex).map(channel);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function toHsl(hex: string): Hsl {
  const [r, g, b] = rgb(hex).map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function toHex({ h, s, l }: Hsl): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number): number => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Tailwind/shadcn tokens are bare "H S% L%" triples. */
function token({ h, s, l }: Hsl): string {
  return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
}

export interface BrandTokens {
  light: { primary: string; primaryForeground: string };
  dark: { primary: string; primaryForeground: string; hex: string };
  /** Text colour on brand-coloured buttons in light mode. */
  lightForegroundHex: string;
}

/**
 * Derives the theme tokens from one brand colour: white or near-black text on buttons, whichever reads
 * better, and a lighter shade for dark mode so the colour still stands out on a dark background.
 */
export function brandTokens(hex: string): BrandTokens {
  const base = toHsl(hex);
  const lightForegroundHex = contrastRatio(hex, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#0A0A0A';

  let dark = { ...base };
  while (contrastRatio(toHex(dark), DARK_BACKGROUND) < 4.5 && dark.l < 90) dark = { ...dark, l: dark.l + 2 };
  const darkHex = toHex(dark);
  const darkForeground = contrastRatio(darkHex, '#0A0A0A') >= contrastRatio(darkHex, '#FFFFFF') ? '#0A0A0A' : '#FFFFFF';

  return {
    light: { primary: token(base), primaryForeground: token(toHsl(lightForegroundHex)) },
    dark: { primary: token(dark), primaryForeground: token(toHsl(darkForeground)), hex: darkHex },
    lightForegroundHex,
  };
}

export const BRAND_PRESETS: { name: string; hex: string }[] = [
  { name: 'Graphite', hex: '#18181B' },
  { name: 'Site blue', hex: '#1D4ED8' },
  { name: 'Steel teal', hex: '#0F766E' },
  { name: 'Safety orange', hex: '#C2410C' },
  { name: 'Brick red', hex: '#B91C1C' },
  { name: 'Forest', hex: '#15803D' },
  { name: 'Royal purple', hex: '#6D28D9' },
  { name: 'Slate', hex: '#334155' },
];
