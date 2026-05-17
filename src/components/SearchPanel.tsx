import { useAtom } from 'jotai'
import { searchPanelOpenAtom } from '@/store/searchPanel'
import appConfig from '@/config.json'
import { useEffect } from 'react'

export function SearchPanel() {
  const { docSearch } = appConfig
  const [isOpen, setIsOpen] = useAtom(searchPanelOpenAtom)

  // Close panel on ESC
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, setIsOpen])

  // Open on Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setIsOpen])

  if (!isOpen) return null
  if (!docSearch.appId || !docSearch.apiKey) return null

  // Search is not configured - the docsearch modal would render here
  // if Algolia credentials were provided
  return null
}
