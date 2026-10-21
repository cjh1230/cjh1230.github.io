import { searchPanelOpenAtom } from '@/store/searchPanel'
import { useSetAtom } from 'jotai'

export function SearchButton() {
  const setSearchPanelOpen = useSetAtom(searchPanelOpenAtom)

  return (
    <button
      className="size-8 flex items-center justify-center border border-primary text-secondary transition-colors hover:text-accent-ink hover:border-accent"
      type="button"
      aria-label="搜索"
      onClick={() => setSearchPanelOpen(true)}
    >
      <i className="iconfont icon-search text-sm" aria-hidden />
    </button>
  )
}
