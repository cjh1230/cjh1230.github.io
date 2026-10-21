import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { stripMarkdown, type SearchDoc } from '@/utils/search'

export const prerender = true

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  )

  const docs: SearchDoc[] = posts.map((post) => ({
    slug: post.slug,
    title: post.data.title,
    summary: post.data.summary ?? '',
    category: post.data.category ?? '',
    tags: post.data.tags,
    date: post.data.date.toISOString().slice(0, 10),
    body: stripMarkdown(post.body ?? ''),
  }))

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
