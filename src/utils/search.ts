import MiniSearch from 'minisearch'

export interface SearchDoc {
  slug: string
  title: string
  summary: string
  category: string
  tags: string[]
  date: string
  body: string
}

export type SearchHit = SearchDoc & { score: number; terms: string[] }

const CJK_RUN = /[\p{Script=Han}]+/gu
const LATIN_WORD = /[a-z0-9][a-z0-9_+#.-]*/g

/**
 * Chinese has no spaces, so index each character plus every two-character
 * bigram. Latin/number runs stay whole. The same tokenizer runs on queries.
 */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  const tokens: string[] = []

  for (const match of lower.matchAll(LATIN_WORD)) {
    tokens.push(match[0])
  }

  for (const match of lower.matchAll(CJK_RUN)) {
    const run = match[0]
    for (let i = 0; i < run.length; i++) {
      tokens.push(run[i])
      if (i < run.length - 1) tokens.push(run.slice(i, i + 2))
    }
  }

  return tokens
}

/** Plain text for the index: code blocks are excluded on purpose. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, ' ')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createSearch(docs: SearchDoc[]) {
  const mini = new MiniSearch<SearchDoc>({
    idField: 'slug',
    fields: ['title', 'summary', 'tags', 'category', 'body'],
    storeFields: ['slug', 'title', 'summary', 'category', 'tags', 'date', 'body'],
    tokenize,
  })

  mini.addAll(docs)
  return mini
}

export function searchPosts(mini: MiniSearch<SearchDoc>, query: string, limit = 20): SearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  return mini
    .search(trimmed, {
      boost: { title: 4, tags: 3, category: 2, summary: 2 },
      prefix: true,
      fuzzy: 0.15,
      combineWith: 'AND',
    })
    .slice(0, limit) as unknown as SearchHit[]
}

/** A short excerpt around the first matching term. */
export function makeSnippet(body: string, query: string, length = 96): string {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  let index = -1
  const lower = body.toLowerCase()
  for (const term of terms) {
    index = lower.indexOf(term)
    if (index >= 0) break
  }

  if (index < 0) {
    return body.length > length ? `${body.slice(0, length)}…` : body
  }

  const start = Math.max(0, index - Math.floor(length / 3))
  const end = Math.min(body.length, start + length)
  const excerpt = body.slice(start, end).replace(/\s+/g, ' ').trim()
  return `${start > 0 ? '…' : ''}${excerpt}${end < body.length ? '…' : ''}`
}
