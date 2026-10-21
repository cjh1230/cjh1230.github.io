import { author, site } from '@/config.json'
import { getIsoDateTime } from '@/utils/date'
import { showToast } from '@/store/toast'

function getPostUrl(slug: string) {
  return new URL(slug, site.url).href
}

export function PostCopyright({
  title,
  slug,
  lastMod,
}: {
  title: string
  slug: string
  lastMod: Date
}) {
  const url = getPostUrl(slug)

  function handleCopyUrl() {
    navigator.clipboard.writeText(url)
    showToast('已复制文章链接')
  }

  return (
    <section className="text-[12px] leading-relaxed text-secondary">
      <div className="label mb-3">引用 / Citation</div>

      <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-1.5">
        <dt className="opacity-60">标题</dt>
        <dd className="text-primary">{title}</dd>
        <dt className="opacity-60">作者</dt>
        <dd>{author.name}</dd>
        <dt className="opacity-60">链接</dt>
        <dd className="mono break-all">
          {url}
          <button type="button" className="sheet-link ml-2 text-secondary" onClick={handleCopyUrl}>
            [复制]
          </button>
        </dd>
        <dt className="opacity-60">更新</dt>
        <dd className="mono">{getIsoDateTime(lastMod)}</dd>
      </dl>

      <p className="mt-4 border-t border-primary pt-3">
        商业转载请联系站长获得授权，非商业转载请注明本文出处及文章链接，您可以自由地在任何媒体以任何形式复制和分发作品，也可以修改和创作，但是分发衍生作品时必须采用相同的许可协议。
        本文采用
        <a
          className="sheet-link mx-1"
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY-NC-SA 4.0
        </a>
        进行许可。
      </p>
    </section>
  )
}
