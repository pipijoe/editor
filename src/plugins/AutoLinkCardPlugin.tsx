import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createTextNode, $getNodeByKey, $getRoot, $isTextNode, TextNode } from 'lexical'

import { $createLinkPreviewCardNode, type LinkCardData } from '@/nodes/LinkPreviewCardNode'

const URL_REGEX = /https?:\/\/[^\s]+/g

async function fetchLinkCard(url: string): Promise<LinkCardData> {
  const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
  if (!response.ok) {
    throw new Error('链接信息获取失败')
  }

  const result = await response.json()
  return {
    url,
    title: result?.data?.title || url,
    description: result?.data?.description || '暂无描述',
    siteName: result?.data?.publisher || new URL(url).hostname,
    image: result?.data?.image?.url,
  }
}

function replaceUrlWithCard(textNode: TextNode, url: string, card: LinkCardData) {
  const text = textNode.getTextContent()
  const index = text.indexOf(url)
  if (index === -1) {
    return
  }

  const before = text.slice(0, index)
  const after = text.slice(index + url.length)

  const nodes = []
  if (before) {
    nodes.push($createTextNode(before))
  }
  nodes.push($createLinkPreviewCardNode(card))
  if (after) {
    nodes.push($createTextNode(after))
  }

  textNode.replace(nodes[0])
  let currentNode = nodes[0]
  for (let i = 1; i < nodes.length; i += 1) {
    currentNode.insertAfter(nodes[i])
    currentNode = nodes[i]
  }
}

export function AutoLinkCardPlugin() {
  const [editor] = useLexicalComposerContext()
  const processingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const textNodes = $getRoot().getAllTextNodes()

        for (const node of textNodes) {
          const urls = node.getTextContent().match(URL_REGEX) ?? []

          for (const url of urls) {
            const token = `${node.getKey()}::${url}`
            if (processingRef.current.has(token)) {
              continue
            }

            processingRef.current.add(token)
            const nodeKey = node.getKey()

            void fetchLinkCard(url)
              .then((card) => {
                editor.update(() => {
                  const latestNode = $getNodeByKey(nodeKey)
                  if (!$isTextNode(latestNode)) {
                    return
                  }
                  replaceUrlWithCard(latestNode, url, card)
                })
              })
              .finally(() => {
                processingRef.current.delete(token)
              })
          }
        }
      })
    })
  }, [editor])

  return null
}
