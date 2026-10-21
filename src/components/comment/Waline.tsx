import { useEffect, useRef, useState } from 'react'

export function Waline({ serverURL }: { serverURL: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

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

    // Hide the sort header while there is nothing to sort.
    const root = ref.current
    const syncEmptyState = () => {
      if (!root) return
      const empty = root.querySelectorAll('.wl-card').length === 0
      root.querySelectorAll('.wl-meta-head').forEach((el) => {
        el.classList.toggle('is-empty', empty)
      })
    }
    const observer = new MutationObserver(syncEmptyState)
    if (root) observer.observe(root, { childList: true, subtree: true })
    syncEmptyState()

    return () => {
      cancelled = true
      observer.disconnect()
      inst?.destroy?.()
    }
  }, [serverURL])

  function toggleEditor() {
    setOpen((value) => {
      const next = !value
      if (next) {
        setTimeout(() => {
          const editor = ref.current?.querySelector<HTMLElement>('.wl-editor')
          editor?.focus()
        }, 80)
      }
      return next
    })
  }

  return (
    <section className="comment-shell mt-10" data-comment-open={open ? 'true' : 'false'}>
      <div className="flex items-baseline justify-between gap-4 border-b border-primary pb-2">
        <h2 className="label">评论 / Comments</h2>
        <button
          type="button"
          className="text-[12px] text-secondary transition-colors hover:text-accent-ink"
          aria-expanded={open}
          aria-controls="comment-editor"
          onClick={toggleEditor}
        >
          {open ? '收起' : '写评论'}
        </button>
      </div>
      <div id="comment-editor" ref={ref} className="pt-4" />
    </section>
  )
}
