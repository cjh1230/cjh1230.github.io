import { color as themeColor } from '@/config.json'

export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
}

export function rgbStr(rgb: Rgb): string {
  return rgb.join(' ')
}

export function mixRgb(a: Rgb, b: Rgb, ratio: number): Rgb {
  const inv = 1 - ratio
  return [
    Math.round(a[0] * inv + b[0] * ratio),
    Math.round(a[1] * inv + b[1] * ratio),
    Math.round(a[2] * inv + b[2] * ratio),
  ]
}

export const ACCENTS = themeColor.accent
export const ACCENT_COUNT = ACCENTS.length

const ACCENT_KEY = 'gyoza-accent'

export function getAccentIndex(): number {
  let raw: number
  try {
    raw = Number.parseInt(localStorage.getItem(ACCENT_KEY) ?? '', 10)
  } catch {
    // storage unavailable — fall back to the default accent
    return 0
  }
  if (Number.isNaN(raw)) return 0
  return Math.min(Math.max(raw, 0), ACCENT_COUNT - 1)
}

export function setAccentIndex(index: number): void {
  const i = Math.min(Math.max(index, 0), ACCENT_COUNT - 1)
  try {
    localStorage.setItem(ACCENT_KEY, String(i))
  } catch {
    // storage unavailable — accent cannot be persisted, ignore
  }
}

export function pickRandomAccentIndex(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] % ACCENT_COUNT
  }
  return Math.floor(Math.random() * ACCENT_COUNT)
}

export function buildAccentStyle(index: number): string {
  const accent = ACCENTS[Math.min(Math.max(index, 0), ACCENT_COUNT - 1)]
  const light = hexToRgb(accent.light)
  const dark = hexToRgb(accent.dark)
  // Text needs 4.5:1 against the light paper; indicators may keep the pure hue.
  const accentInk = mixRgb(light, hexToRgb(themeColor.text.primary.light), 0.42)
  const c = (key: string, rgb: Rgb) => `  ${key}: ${rgbStr(rgb)};`

  // Backgrounds stay neutral on purpose: the accent is a state signal only.
  return `html {
${c('--color-accent', light)}
${c('--color-accent-ink', accentInk)}
${c('--color-bg-root', hexToRgb(themeColor.bg.root.light))}
${c('--color-bg-primary', hexToRgb(themeColor.bg.primary.light))}
${c('--color-bg-secondary', hexToRgb(themeColor.bg.secondary.light))}
${c('--color-bg-surface', hexToRgb(themeColor.bg.surface.light))}
${c('--color-text-primary', hexToRgb(themeColor.text.primary.light))}
${c('--color-text-secondary', hexToRgb(themeColor.text.secondary.light))}
${c('--color-border-primary', hexToRgb(themeColor.border.primary.light))}
}
[data-theme='dark'] {
${c('--color-accent', dark)}
${c('--color-accent-ink', dark)}
${c('--color-bg-root', hexToRgb(themeColor.bg.root.dark))}
${c('--color-bg-primary', hexToRgb(themeColor.bg.primary.dark))}
${c('--color-bg-secondary', hexToRgb(themeColor.bg.secondary.dark))}
${c('--color-bg-surface', hexToRgb(themeColor.bg.surface.dark))}
${c('--color-text-primary', hexToRgb(themeColor.text.primary.dark))}
${c('--color-text-secondary', hexToRgb(themeColor.text.secondary.dark))}
${c('--color-border-primary', hexToRgb(themeColor.border.primary.dark))}
}`
}
