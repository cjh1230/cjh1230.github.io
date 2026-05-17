import { useAtomValue } from 'jotai'
import { toastsAtom } from '@/store/toast'

export function ToastContainer() {
  const toasts = useAtomValue(toastsAtom)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-primary text-primary text-sm border border-primary rounded-lg px-4 py-2 shadow-lg"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
