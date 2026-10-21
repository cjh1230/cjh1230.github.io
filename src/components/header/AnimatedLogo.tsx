import { AnimatePresence, motion } from 'framer-motion'
import { useShouldHeaderMetaShow, useIsMobile } from './hooks'
import { author, site } from '@/config.json'

export function AnimatedLogo() {
  const isMobile = useIsMobile()
  const shouldHeaderMetaShow = useShouldHeaderMetaShow()

  if (!isMobile) {
    return <Logo />
  }

  return (
    <AnimatePresence>
      {!shouldHeaderMetaShow && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Logo />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Logo() {
  return (
    <a className="flex min-h-10 items-center gap-2.5 min-w-0" href="/" title="返回首页">
      <img
        className="size-7 shrink-0 select-none object-cover border border-primary"
        src={author.avatar}
        alt=""
        width="28"
        height="28"
      />
      <span className="font-mono text-sm font-bold tracking-tight leading-none">{site.title}</span>
    </a>
  )
}
