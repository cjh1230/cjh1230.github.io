import { menus } from '@/config.json'
import { createContext, useContext, useState, forwardRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'

const contentVariants = {
  hidden: {
    x: '-100%',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  visible: {
    x: 0,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
      duration: 0.2,
      ease: 'easeOut',
    },
  },
}

const menuItemVariants = {
  hidden: {
    opacity: 0,
    x: '-100%',
  },
  visible: {
    opacity: 1,
    x: 0,
  },
}

export function HeaderDrawer({ zIndex = 999 }: { zIndex?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const overlayZIndex = zIndex - 1
  const contentZIndex = zIndex

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <TriggerButton />
      </Dialog.Trigger>

      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/50"
                style={{ zIndex: overlayZIndex }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { delay: 0.1 } }}
              ></motion.div>
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed left-0 inset-y-0 h-full bg-primary border-r border-primary p-4 flex flex-col justify-center w-[260px] max-w-[80%]"
                style={{ zIndex: contentZIndex }}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <div className="label mb-4 px-2">Index</div>
                <DrawerContext.Provider
                  value={{
                    dismiss() {
                      setIsOpen(false)
                    },
                  }}
                >
                  <DrawerContentImpl />
                </DrawerContext.Provider>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

const TriggerButton = forwardRef<HTMLButtonElement>((props, ref) => {
  return (
    <button
      ref={ref}
      className="size-8 flex items-center justify-center border border-primary text-secondary"
      type="button"
      aria-label="打开菜单"
      {...props}
    >
      <i className="iconfont icon-menu text-sm" aria-hidden />
    </button>
  )
})

function DrawerContentImpl() {
  const { dismiss } = useContext(DrawerContext)

  return (
    <ul className="overflow-y-auto overflow-x-hidden min-h-0">
      {menus.map((menu, i) => (
        <motion.li key={menu.name} variants={menuItemVariants}>
          <a
            className="flex items-baseline gap-3 px-2 py-2.5 border-b border-primary text-sm"
            href={menu.link}
            onClick={dismiss}
          >
            <span className="mono text-[10px] text-secondary">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{menu.name}</span>
          </a>
        </motion.li>
      ))}
    </ul>
  )
}

const DrawerContext = createContext<{ dismiss(): void }>(null!)
