import { describe, it, expect, beforeEach } from 'vitest'
import {
  hexToRgb,
  mixRgb,
  ACCENT_COUNT,
  getAccentIndex,
  setAccentIndex,
  buildAccentStyle,
} from './accent'

beforeEach(() => localStorage.clear())

describe('hexToRgb', () => {
  it('converts a hex color to rgb components', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255])
  })
})

describe('mixRgb', () => {
  it('blends two rgb values by ratio', () => {
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128])
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0)).toEqual([0, 0, 0])
  })
})

describe('accent index storage', () => {
  it('defaults to 0 when nothing stored', () => {
    expect(getAccentIndex()).toBe(0)
  })
  it('round-trips a stored index', () => {
    setAccentIndex(3)
    expect(getAccentIndex()).toBe(3)
  })
  it('clamps out-of-range values', () => {
    setAccentIndex(9999)
    expect(getAccentIndex()).toBe(ACCENT_COUNT - 1)
  })
})

describe('buildAccentStyle', () => {
  it('emits all required css variables', () => {
    const style = buildAccentStyle(0)
    expect(style).toContain('--color-accent:')
    expect(style).toContain('--color-bg-root:')
    expect(style).toContain('--color-bg-surface:')
    expect(style).toContain('--color-text-primary:')
    expect(style).toContain('--color-border-primary:')
    expect(style).toContain("[data-theme='dark']")
  })
})
