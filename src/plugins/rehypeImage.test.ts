import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { h } from 'hastscript'
import { getCaption, rehypeImage, resolveImageSize } from './rehypeImage'

const FIXTURE_DIR = path.join(process.cwd(), 'node_modules/.tmp-image-test')
const FIXTURE = path.join(FIXTURE_DIR, 'fix.png')

// 4x3 1px png
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAYAAACe5tRKAAAAEklEQVR42mP8z8AARAzDgUYgBgD24wQbYwBQlQAAAABJRU5ErkJggg=='

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true })
  writeFileSync(FIXTURE, Buffer.from(PNG, 'base64'))
})

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true })
})

describe('resolveImageSize', () => {
  it('reads dimensions of a local png', () => {
    expect(resolveImageSize(FIXTURE)).toEqual({ width: 4, height: 3 })
  })
  it('returns empty object for missing file', () => {
    expect(resolveImageSize('/does/not/exist.png')).toEqual({})
  })
})

describe('figure captions', () => {
  it('numbers standalone figures and falls back to alt text', () => {
    const tree = h('div', [h('p', [h('img', { src: '/x.png', alt: '原始帧' })])])
    rehypeImage()(tree)

    const figure = tree.children[0] as any
    expect(figure.tagName).toBe('figure')
    expect(figure.children[1].tagName).toBe('figcaption')
    expect(figure.children[1].children[0].children[0].value).toBe('图 1')
    expect(figure.children[1].children[1].children[0].value).toBe(' · 原始帧')
  })

  it('ignores generic alt text', () => {
    expect(getCaption({ properties: { alt: '图片描述' } } as any)).toBe('')
    expect(getCaption({ properties: { alt: 'Image' } } as any)).toBe('')
  })
})
