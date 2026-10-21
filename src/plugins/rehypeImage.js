import { h } from 'hastscript'
import { visit } from 'unist-util-visit'
import { imageSize } from 'image-size'
import path from 'node:path'
import fs from 'node:fs'

export function resolveImageSize(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      // image-size v2 takes a Buffer/Uint8Array, not a file path (v1 API)
      const { width, height } = imageSize(fs.readFileSync(filePath))
      if (width && height) return { width, height }
    }
  } catch {
    // ignore unreadable / unsupported images
  }
  return {}
}

export function rehypeImage() {
  return function (tree) {
    let figureNumber = 0
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'p' && node.children.length === 1) {
        const child = node.children[0]
        if (child.tagName === 'img') {
          figureNumber += 1
          parent.children[index] = buildFigure(child, figureNumber)
        }
      } else if (node.tagName === 'img') {
        parent.children[index] = buildImage(node)
      }
    })
  }
}

const GENERIC_ALTS = new Set(['图片描述', '图片', 'image', 'img', ''])

export function getCaption(node) {
  const title = typeof node.properties.title === 'string' ? node.properties.title.trim() : ''
  if (title) return title

  const alt = typeof node.properties.alt === 'string' ? node.properties.alt.trim() : ''
  return GENERIC_ALTS.has(alt.toLowerCase()) ? '' : alt
}

function buildImage(node) {
  const props = { ...node.properties, loading: 'lazy', decoding: 'async' }
  const src = node.properties.src
  if (typeof src === 'string' && src.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', src)
    const size = resolveImageSize(filePath)
    if (size.width) props.width = size.width
    if (size.height) props.height = size.height
  }
  return h('img', props)
}

function buildFigure(node, figureNumber) {
  const caption = getCaption(node)
  const label = `图 ${figureNumber}`
  const figcaption = h('figcaption', [
    h('span', { className: ['fig-number'] }, label),
    caption ? h('span', { className: ['fig-caption'] }, ` · ${caption}`) : null,
  ])

  return h('figure', null, [buildImage(node), figcaption])
}
