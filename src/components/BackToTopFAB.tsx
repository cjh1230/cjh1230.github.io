import { useAtomValue } from 'jotai'
import { pageScrollLocationAtom } from '@/store/scrollInfo'
import { AnimatePresence, motion } from 'framer-motion'

export function BackToTopFAB() {
  const scrollY = useAtomValue(pageScrollLocationAtom)
  const isShow = scrollY > 100

  return (
    <div className="fixed right-4 bottom-6 z-10">
      <AnimatePresence>{isShow && <BackToTop />}</AnimatePresence>
    </div>
  )
}

function BackToTop() {
  const handleBackToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <motion.button
      className="size-9 flex items-center justify-center border border-primary bg-primary text-secondary transition-colors hover:text-accent-ink hover:border-accent"
      type="button"
      aria-label="回到顶部"
      onClick={handleBackToTop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <span className="mono text-sm leading-none" aria-hidden>
        ↑
      </span>
    </motion.button>
  )
}
