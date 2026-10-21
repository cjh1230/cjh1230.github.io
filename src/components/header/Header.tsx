import { BluredBackground } from './BluredBackground'
import { HeaderContent } from './HeaderContent'
import { SearchButton } from './SearchButton'
import { AnimatedLogo } from './AnimatedLogo'
import { HeaderMeta } from './HeaderMeta'
import { HeaderDrawer } from './HeaderDrawer'
import { useIsMobile } from './hooks'

export function Header() {
  const isMobile = useIsMobile()

  return (
    <header className="fixed top-0 inset-x-0 h-14 z-10">
      <BluredBackground />
      <div className="max-w-[1200px] h-full px-4 md:px-8 mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile ? <HeaderDrawer /> : <AnimatedLogo />}
          {!isMobile && (
            <>
              <span className="h-3.5 w-px bg-[rgb(var(--color-border-primary))]" aria-hidden />
              <span className="label hidden lg:block">Embedded / CV / Robotics</span>
            </>
          )}
        </div>
        <div className="relative flex items-center justify-center">
          {isMobile ? <AnimatedLogo /> : <HeaderContent />}
          <HeaderMeta />
        </div>
        <div className="flex items-center justify-end">
          <SearchButton />
        </div>
      </div>
    </header>
  )
}
