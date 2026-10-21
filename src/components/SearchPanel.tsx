import * as Dialog from '@radix-ui/react-dialog'
import { useAtom } from 'jotai'
import { clsx } from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type MiniSearch from 'minisearch'
import type { SearchDoc, SearchHit } from '@/utils/search'
import { searchPanelOpenAtom } from '@/store/searchPanel'

type Engine = MiniSearch<SearchDoc>
type SearchApi = typeof import('@/utils/search')

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return text

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const lowerTerms = terms.map((term) => term.toLowerCase())

  return text.split(pattern).map((part, index) =>
    lowerTerms.includes(part.toLowerCase()) ? (
      <mark key={index} className="bg-transparent text-accent-ink">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

export function SearchPanel() {
  const [isOpen, setIsOpen] = useAtom(searchPanelOpenAtom)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [api, setApi] = useState<SearchApi | null>(null)

  const engineRef = useRef<Engine | null>(null)
  const loadRef = useRef<Promise<void> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Open on Ctrl/Cmd+K.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setIsOpen])

  // Build the index once, on first open.
  useEffect(() => {
    if (!isOpen || engineRef.current || loadRef.current) return

    setStatus('loading')
    const load = (async () => {
      const [mod, docs] = await Promise.all([
        import('@/utils/search'),
        fetch('/search-index.json').then((response) => {
          if (!response.ok) throw new Error('search index unavailable')
          return response.json() as Promise<SearchDoc[]>
        }),
      ])
      engineRef.current = mod.createSearch(docs)
      setApi(mod)
      setStatus('ready')
    })()

    loadRef.current = load
    load.catch(() => {
      loadRef.current = null
      setStatus('error')
    })
  }, [isOpen])

  // Query with a short debounce so typing stays smooth.
  useEffect(() => {
    if (!api || !engineRef.current) {
      setResults([])
      return
    }

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setActive(0)
      return
    }

    const timer = setTimeout(() => {
      setResults(api.searchPosts(engineRef.current!, trimmed))
      setActive(0)
    }, 80)

    return () => clearTimeout(timer)
  }, [query, api, status])

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setQuery('')
      setResults([])
      setActive(0)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const hit = results[active]
      if (hit) {
        event.preventDefault()
        window.location.href = `/posts/${hit.slug}`
      }
    }
  }

  const countLabel =
    status === 'loading'
      ? 'Indexing'
      : status === 'error'
        ? 'Index unavailable'
        : query.trim()
          ? `${results.length} results`
          : 'Type to search'

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-root" />
        <Dialog.Content
          className="fixed inset-0 z-[1001] overflow-y-auto focus:outline-none"
          aria-label="站内搜索"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <Dialog.Title className="sr-only">站内搜索</Dialog.Title>
          <Dialog.Description className="sr-only">
            搜索文章标题、标签与正文。方向键选择结果，回车打开，Esc 关闭。
          </Dialog.Description>

          <div className="max-w-[760px] mx-auto px-4 md:px-0 pt-16 md:pt-24 pb-16">
            <div className="flex items-center justify-between gap-4">
              <span className="label">Search / 搜索</span>
              <Dialog.Close asChild>
                <button type="button" className="label transition-colors hover:text-primary">
                  Esc 关闭
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-3 flex items-center gap-3 border-b border-primary transition-colors focus-within:border-accent">
              <i className="iconfont icon-search text-sm text-secondary" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                className="search-input w-full bg-transparent py-3 font-mono text-lg outline-none placeholder:text-secondary/60"
                placeholder="搜索标题、标签、正文…"
                aria-label="搜索文章"
                aria-controls="search-results"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-4">
              <span className="label num" aria-live="polite">
                {countLabel}
              </span>
              <span className="label hidden sm:block">↑↓ 选择 · ↵ 打开</span>
            </div>

            <ul id="search-results" className="mt-4 border-t border-primary">
              {results.map((hit, index) => (
                <li key={hit.slug}>
                  <a
                    href={`/posts/${hit.slug}`}
                    onMouseEnter={() => setActive(index)}
                    aria-current={index === active ? 'true' : undefined}
                    className={clsx(
                      'grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-b border-primary py-3 transition-colors',
                      index === active ? 'text-accent-ink' : 'text-primary hover:text-accent-ink',
                    )}
                  >
                    <span
                      className={clsx(
                        'mono num pt-0.5 text-[10px]',
                        index === active ? 'text-accent-ink' : 'text-secondary',
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="mono block text-[11px] text-secondary">
                        {hit.date} · {hit.category || '未分类'}
                      </span>
                      <span className="mt-1 block text-[15px] font-medium leading-snug">
                        {highlight(hit.title, query)}
                      </span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-secondary line-clamp-2">
                        {highlight(api ? api.makeSnippet(hit.body, query) : hit.summary, query)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            {query.trim() && status === 'ready' && results.length === 0 && (
              <p className="mt-8 text-sm leading-relaxed text-secondary">
                没有找到匹配内容。试试更短的关键词，或只搜一个术语。
              </p>
            )}

            <p className="mt-10 label">Local index · 查询不会离开浏览器</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
