import { h } from 'hastscript'
import { visit } from 'unist-util-visit'

export function rehypeLink() {
  return (tree) => {
    const insertions = []

    visit(tree, { tagName: 'a' }, (node, index, parent) => {
      const isExternal = node.properties.href.startsWith('http')
      if (isExternal) {
        node.properties = {
          ...node.properties,
          rel: 'noopener noreferrer',
          target: '_blank',
        }
        parent.children[index] = node
        const icon = h('i', { class: 'iconfont icon-external-link' })
        insertions.push({ parent, index: index + 1, icon })
      }
    })

    // Apply insertions in reverse order to keep indices stable
    insertions.reverse()
    for (const { parent, index, icon } of insertions) {
      parent.children.splice(index, 0, icon)
    }
  }
}
