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
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-primary/15 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm tabular-nums">{percent}%</span>
    </div>
  )
}
