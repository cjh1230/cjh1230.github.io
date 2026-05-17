import { atom, getDefaultStore } from 'jotai'

export interface ToastItem {
  id: number
  message: string
}

let nextId = 0

export const toastsAtom = atom<ToastItem[]>([])

export function showToast(message: string) {
  const store = getDefaultStore()
  const id = ++nextId
  const prev = store.get(toastsAtom)
  store.set(toastsAtom, [...prev, { id, message }])
  setTimeout(() => {
    store.set(toastsAtom, (current) => current.filter((t) => t.id !== id))
  }, 3000)
}
