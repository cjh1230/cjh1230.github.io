import { useLayoutEffect, useRef } from 'react'
import { useSetAtom } from 'jotai'
import { pageScrollLocationAtom, pageScrollDirectionAtom } from '@/store/scrollInfo'

export function PageScrollInfoProvider() {
  const setScrollLocation = useSetAtom(pageScrollLocationAtom)
  const setScrollDirection = useSetAtom(pageScrollDirectionAtom)
  const prevScrollY = useRef(0)
  const rafRef = useRef(0)

  useLayoutEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        let currentTop = document.documentElement.scrollTop

        if (currentTop === 0) {
          const bodyStyle = document.body.style
          if (bodyStyle.position === 'fixed') {
            const bodyTop = bodyStyle.top
            currentTop = Math.abs(parseInt(bodyTop, 10))
          }
        }

        setScrollDirection(prevScrollY.current - currentTop > 0 ? 'up' : 'down')
        prevScrollY.current = currentTop
        setScrollLocation(currentTop)
        rafRef.current = 0
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])
  return null
}
