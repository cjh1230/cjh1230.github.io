import { AnimatePresence, motion } from 'framer-motion'
import { useHeaderMetaInfo, useShouldHeaderMetaShow } from './hooks'

export function HeaderMeta() {
  const { title, slug } = useHeaderMetaInfo()
  const shouldShow = useShouldHeaderMetaShow()

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="absolute inset-0 z-1 flex items-center justify-between gap-6 px-2 min-w-[320px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="min-w-0">
            <div className="label">Now reading</div>
            <h2 className="truncate text-[13px] font-semibold leading-tight">{title}</h2>
          </div>
          <div className="hidden md:block shrink-0 max-w-[240px] text-right">
            <div className="label">Ref</div>
            <div className="mono truncate text-xs leading-tight text-secondary">{slug}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
