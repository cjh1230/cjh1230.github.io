import { h } from 'hastscript'
import { visit } from 'unist-util-visit'

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
  return h('img', {
    ...node.properties,
    loading: 'lazy',
    decoding: 'async',
    'data-zoomable': '',
  })
}

function buildFigure(node) {
  const imgProps = node.properties
  let imgTitle = node.properties.title
  if (imgTitle) {
    imgTitle = imgTitle.trim()
  }

  return h('figure', null, [buildImage(node), imgTitle ? h('figcaption', imgTitle) : null])
}
