import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { resolveImageSize } from './rehypeImage'

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
