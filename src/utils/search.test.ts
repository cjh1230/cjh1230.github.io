import { describe, it, expect } from 'vitest'
import {
  createSearch,
  makeSnippet,
  searchPosts,
  stripMarkdown,
  tokenize,
  type SearchDoc,
} from './search'

const docs: SearchDoc[] = [
  {
    slug: 'white-balance',
    title: '白平衡算法',
    summary: 'Gray World 与 White Patch',
    category: 'embedded',
    tags: ['ISP'],
    date: '2026-05-16',
    body: '关掉自动白平衡后画面偏绿，用纯 C 把颜色拉回中性。',
  },
  {
    slug: 'gamma',
    title: 'Gamma 校正',
    summary: '直方图均衡化',
    category: 'embedded',
    tags: ['图像质量'],
    date: '2026-05-17',
    body: '使用纯 C 实现 gamma 查找表。',
  },
]

describe('tokenize', () => {
  it('emits CJK unigrams and bigrams plus latin words', () => {
    const tokens = tokenize('YUV 与白平衡')
    expect(tokens).toContain('yuv')
    expect(tokens).toContain('白')
    expect(tokens).toContain('白平')
    expect(tokens).toContain('平衡')
  })
})

describe('stripMarkdown', () => {
  it('drops fenced code but keeps inline code and link text', () => {
    const markdown = '正文 `inline`\n\n```c\nsecret_function();\n```\n\n[链接](https://example.com)'
    const text = stripMarkdown(markdown)
    expect(text).toContain('inline')
    expect(text).toContain('链接')
    expect(text).not.toContain('secret_function')
  })

  it('drops horizontal rules and table separators', () => {
    const text = stripMarkdown('前言\n\n---\n\n| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(text).not.toContain('---')
    expect(text).toContain('前言')
  })
})

describe('searchPosts', () => {
  it('finds Chinese terms by bigram', () => {
    expect(searchPosts(createSearch(docs), '白平衡')[0].slug).toBe('white-balance')
  })

  it('finds latin terms case-insensitively', () => {
    expect(searchPosts(createSearch(docs), 'gamma')[0].slug).toBe('gamma')
  })

  it('returns nothing for terms only present in code blocks', () => {
    const markdown = '正文\n\n```c\nsecret_function();\n```'
    const engine = createSearch([{ ...docs[0], body: stripMarkdown(markdown) }])
    expect(searchPosts(engine, 'secret_function')).toHaveLength(0)
  })
})

describe('makeSnippet', () => {
  it('centers the match and adds ellipses', () => {
    const body = `${'前'.repeat(100)}白平衡${'后'.repeat(100)}`
    const snippet = makeSnippet(body, '白平衡', 20)
    expect(snippet).toContain('白平衡')
    expect(snippet.startsWith('…')).toBe(true)
  })
})
