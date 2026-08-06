import { useState } from 'react'
import { ACCENTS, getAccentIndex, setAccentIndex } from '@/utils/accent'

export function AccentSwitcher() {
  const [active, setActive] = useState(() => getAccentIndex())

  function select(index: number) {
    setAccentIndex(index)
    setActive(index)
    window.dispatchEvent(new CustomEvent('accent-change'))
  }

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="选择主题强调色">
      {ACCENTS.map((accent, i) => (
        <button
          key={accent.light}
          type="button"
          role="radio"
          aria-checked={i === active}
          aria-label={`强调色 ${i + 1}`}
          onClick={() => select(i)}
          className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${
            i === active ? 'border-primary scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: accent.light }}
        />
      ))}
    </div>
  )
}
