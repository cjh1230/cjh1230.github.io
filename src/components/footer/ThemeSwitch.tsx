import { themeAtom } from '@/store/theme'
import { useAtom } from 'jotai'
import { clsx } from 'clsx'

const OPTIONS = [
  { value: 'light', label: '亮色', icon: 'icon-sun' },
  { value: 'system', label: '自动', icon: 'icon-computer' },
  { value: 'dark', label: '暗色', icon: 'icon-moon' },
] as const

export function ThemeSwitch() {
  const [theme, setTheme] = useAtom(themeAtom)

  return (
    <div className="flex border border-primary" role="radiogroup" aria-label="主题">
      {OPTIONS.map((option, i) => (
        <button
          key={option.value}
          className={clsx(
            'flex min-h-9 items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors',
            i > 0 && 'border-l border-primary',
            theme === option.value ? 'text-accent-ink' : 'text-secondary hover:text-primary',
          )}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          aria-label={option.label}
          onClick={() => setTheme(option.value)}
        >
          <i className={clsx('iconfont', option.icon)} aria-hidden />
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
