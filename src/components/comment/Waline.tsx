import { useEffect, useRef } from 'react'

export function Waline({ serverURL }: { serverURL: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let inst: { destroy?: () => void } | null = null

    // @waline/client/style is a CSS entrypoint without type declarations
    // @ts-expect-error
    Promise.all([import('@waline/client'), import('@waline/client/style')])
      .then(([{ init }]) => {
        if (cancelled || !ref.current) return
        inst = init({
          el: ref.current,
          serverURL,
          dark: "[data-theme='dark']",
          login: 'force',
          imageUploader: false,
          search: false,
          locale: { placeholder: '发条友善的评论吧（支持 Markdown 语法）…' },
          emoji: ['//unpkg.com/@waline/emojis@1.1.0/bilibili'],
        })
      })
      .catch(() => {
        /* waline load failure is non-fatal */
      })

    return () => {
      cancelled = true
      inst?.destroy?.()
    }
  }, [serverURL])

  return <div ref={ref}></div>
}
