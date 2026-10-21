import { useEffect, useState, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { pageScrollLocationAtom } from '@/store/scrollInfo'

export function ReadingProgress() {
  const [percent, setPercent] = useState(0)
  const scrollY = useAtomValue(pageScrollLocationAtom)
  const articleRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!articleRef.current) {
      articleRef.current = document.querySelector('#markdown-wrapper')
    }
    if (!articleRef.current) return

    const { offsetHeight, offsetTop } = articleRef.current
    const fullHeight = offsetHeight + offsetTop - window.innerHeight

    if (fullHeight <= 0 || scrollY > fullHeight) {
      setPercent(100)
    } else {
      setPercent(Math.floor((scrollY / fullHeight) * 100))
    }
  }, [scrollY])

  return (
    <div>
      <div className="flex items-baseline justify-between mono text-[10px] uppercase tracking-[0.08em] text-secondary">
        <span>阅读进度</span>
        <span className="num">{percent}%</span>
      </div>
      <div className="mt-2 h-px w-full bg-[rgb(var(--color-border-primary))]">
        <div
          className="h-px bg-accent transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
