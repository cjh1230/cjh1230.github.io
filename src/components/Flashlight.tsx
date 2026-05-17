import { useLayoutEffect, useRef, useState } from 'react'

export function Flashlight() {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const rafRef = useRef(0)
  const bgRef = useRef('')
  const mountedRef = useRef(false)

  useLayoutEffect(() => {
    const media = window.matchMedia('(hover: hover)')
    if (!media.matches) return

    mountedRef.current = true

    const handleMouseMove = (event: MouseEvent) => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (mountedRef.current) {
          setCursor({ x: event.clientX, y: event.clientY })
        }
      })
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  if (!cursor) return null

  if (!bgRef.current) {
    bgRef.current = `radial-gradient(
      circle 16vmax at ${cursor.x}px ${cursor.y}px,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.5) 80%,
      rgba(0, 0, 0, 0.8) 100%
    )`
  }

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(
          circle 16vmax at ${cursor.x}px ${cursor.y}px,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 0.5) 80%,
          rgba(0, 0, 0, 0.8) 100%
        )`,
      }}
    />
  )
}
