import { menus } from '@/config.json'
import { clsx } from 'clsx'
import { usePathName, useShouldHeaderMetaShow } from './hooks'

export function HeaderContent() {
  const shouldHeaderMetaShow = useShouldHeaderMetaShow()

  if (shouldHeaderMetaShow) return null

  return <HeaderMenu />
}

function HeaderMenu() {
  const pathName = usePathName()

  return (
    <nav aria-label="主导航" className="flex items-center">
      {menus.map((menu, i) => {
        const isActive = pathName === menu.link
        return (
          <a
            key={menu.name}
            href={menu.link}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'group relative flex items-baseline gap-1.5 px-3 py-1.5 text-[13px] transition-colors',
              isActive ? 'text-accent-ink' : 'text-secondary hover:text-primary',
            )}
          >
            <span className="hidden md:inline font-mono text-[10px] tracking-[0.08em] opacity-60 num">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{menu.name}</span>
            <span
              aria-hidden
              className={clsx(
                'absolute left-3 right-3 bottom-0 h-px origin-left bg-accent transition-transform duration-200',
                isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
              )}
            />
          </a>
        )
      })}
    </nav>
  )
}
