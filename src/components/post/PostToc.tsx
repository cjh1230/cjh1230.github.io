import { pageScrollLocationAtom, pageScrollDirectionAtom } from '@/store/scrollInfo'
import type { MarkdownHeading } from 'astro'
import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { startTransition, useEffect, useRef, useState } from 'react'

function useActiveItem() {
  const [activeItem, setActiveItem] = useState('')
  const scrollY = useAtomValue(pageScrollLocationAtom)

  useEffect(() => {
    const $article = document.querySelector('#markdown-wrapper')
    if (!$article) return
    const $headings = Array.from($article.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    for (let i = 0; i < $headings.length; i++) {
      const item = $headings[i]
      const nextItem = $headings[i + 1]
      const itemTop = item.getBoundingClientRect().top
      const nextItemTop = nextItem ? nextItem.getBoundingClientRect().top : 10000

      if (itemTop <= 80 && nextItemTop > 80) {
        startTransition(() => {
          setActiveItem(item.id)
        })
        break
      }
    }
  }, [scrollY])

  return activeItem
}

export function PostToc({ headings }: { headings: MarkdownHeading[] }) {
  const activeItem = useActiveItem()

  return (
    <ul
      className="relative overflow-y-auto text-[12px] group"
      style={{
        maxHeight: 'min(380px, calc(100vh - 250px))',
        scrollbarWidth: 'none',
      }}
    >
      {headings.map((item) => (
        <TocItem
          key={item.slug}
          slug={item.slug}
          text={item.text}
          depth={item.depth}
          isActive={item.slug === activeItem}
        />
      ))}
    </ul>
  )
}

export function TocItem({
  slug,
  text,
  depth,
  isActive,
}: {
  slug: string
  text: string
  depth: number
  isActive: boolean
}) {
  const itemRef = useRef<HTMLLIElement>(null)
  const scrollDirection = useAtomValue(pageScrollDirectionAtom)

  useEffect(() => {
    if (!isActive) return
    const $item = itemRef.current
    if (!$item) return
    const $container = $item.parentElement
    if (!$container) return

    const containerHeight = $container.clientHeight
    const itemHeight = $item.clientHeight
    const itemOffsetTop = $item.offsetTop
    const scrollTop = $container.scrollTop

    const itemTop = itemOffsetTop - scrollTop
    const itemBottom = itemTop + itemHeight

    if (itemTop < 0 || itemBottom > containerHeight) {
      if (scrollDirection === 'up') {
        $container.scrollTop = itemOffsetTop - containerHeight + itemHeight
      } else {
        $container.scrollTop = itemOffsetTop
      }
    }
  }, [isActive])

  return (
    <li ref={itemRef}>
      <a
        className={clsx(
          'block border-l py-1 leading-snug transition-colors',
          isActive
            ? 'border-accent text-accent-ink'
            : 'border-primary text-secondary opacity-70 group-hover:opacity-100 hover:text-primary',
        )}
        style={{ paddingLeft: `${12 + Math.max(0, depth - 2) * 10}px` }}
        href={`#${slug}`}
      >
        {text}
      </a>
    </li>
  )
}
