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
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'p' && node.children.length === 1) {
        const child = node.children[0]
        if (child.tagName === 'img') {
          parent.children[index] = buildFigure(child)
        }
      } else if (node.tagName === 'img') {
        parent.children[index] = buildImage(node)
      }
    })
  }
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

function buildFigure(node) {
  let imgTitle = node.properties.title
  if (imgTitle) {
    imgTitle = imgTitle.trim()
  }
  return h('figure', null, [buildImage(node), imgTitle ? h('figcaption', imgTitle) : null])
}
