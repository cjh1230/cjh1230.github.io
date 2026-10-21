import { useState } from 'react'
import { ACCENTS, getAccentIndex, setAccentIndex } from '@/utils/accent'
import { clsx } from 'clsx'

export function AccentSwitcher() {
  const [active, setActive] = useState(() => getAccentIndex())
  const [open, setOpen] = useState(false)

  function select(index: number) {
    setAccentIndex(index)
    setActive(index)
    window.dispatchEvent(new CustomEvent('accent-change'))
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={open ? '收起强调色选择' : '更换强调色'}
        aria-expanded={open}
        title="更换强调色"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-6 items-center justify-center"
      >
        <span
          className="size-3.5 border border-[rgb(var(--color-text-primary))]"
          style={{ backgroundColor: ACCENTS[active].light }}
        />
      </button>

      {open ? (
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="选择强调色">
          {ACCENTS.map((accent, i) => (
            <button
              key={accent.light}
              type="button"
              role="radio"
              aria-checked={i === active}
              aria-label={`强调色 ${i + 1}`}
              onClick={() => select(i)}
              className="inline-flex size-6 items-center justify-center"
            >
              <span
                className={clsx(
                  'size-3.5 border transition-transform',
                  i === active
                    ? 'border-[rgb(var(--color-text-primary))] scale-110'
                    : 'border-transparent hover:scale-110',
                )}
                style={{ backgroundColor: accent.light }}
              />
            </button>
          ))}
          <button
            type="button"
            className="ml-1 inline-flex min-h-6 items-center text-[11px] text-secondary transition-colors hover:text-primary"
            onClick={() => setOpen(false)}
          >
            收起
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex min-h-6 items-center text-[11px] text-secondary transition-colors hover:text-primary"
          onClick={() => setOpen(true)}
        >
          更换
        </button>
      )}
    </div>
  )
}
