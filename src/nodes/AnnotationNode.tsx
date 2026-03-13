import { useEffect, useMemo, useRef, type JSX } from 'react'
import {
  $createParagraphNode,
  $getNodeByKey,
  $isParagraphNode,
  DecoratorNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'

const EMOJI_OPTIONS = ['💡', '📝', '✅', '📌', '🔥', '⭐️']

type SerializedAnnotationNode = Spread<
  {
    content: string
    emoji: string
    type: 'annotation'
    version: 1
  },
  SerializedLexicalNode
>

function AnnotationComponent({
  autoFocus,
  content,
  editor,
  emoji,
  nodeKey,
}: {
  autoFocus: boolean
  content: string
  editor: LexicalEditor
  emoji: string
  nodeKey: NodeKey
}) {
  const normalizedEmoji = useMemo(() => (EMOJI_OPTIONS.includes(emoji) ? emoji : '💡'), [emoji])
  const contentRef = useRef<HTMLSpanElement>(null)

  const focusContent = () => {
    const element = contentRef.current
    if (!element) {
      return
    }

    element.focus()

    const selection = window.getSelection()
    if (!selection) {
      return
    }

    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const cycleEmoji = () => {
    const currentIndex = EMOJI_OPTIONS.indexOf(normalizedEmoji)
    const nextEmoji = EMOJI_OPTIONS[(currentIndex + 1) % EMOJI_OPTIONS.length]

    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isAnnotationNode(node)) {
        node.setEmoji(nextEmoji)
      }
    })
  }

  const updateContent = (content: string) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isAnnotationNode(node)) {
        node.setContent(content)
      }
    })
  }

  const getCurrentLineText = (element: HTMLSpanElement): string => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return element.textContent ?? ''
    }

    const range = selection.getRangeAt(0)
    if (!element.contains(range.startContainer)) {
      return element.textContent ?? ''
    }

    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(element)
    beforeRange.setEnd(range.startContainer, range.startOffset)
    const beforeText = beforeRange.toString()

    const afterRange = document.createRange()
    afterRange.selectNodeContents(element)
    afterRange.setStart(range.startContainer, range.startOffset)
    const afterText = afterRange.toString()

    const beforeLines = beforeText.split('\n')
    const beforeLine = beforeLines[beforeLines.length - 1] ?? ''
    const afterLine = afterText.split('\n')[0] ?? ''

    return `${beforeLine}${afterLine}`.trim()
  }

  const moveCursorBelowAnnotation = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (!$isAnnotationNode(node)) {
        return
      }

      const nextSibling = node.getNextSibling()
      if ($isParagraphNode(nextSibling)) {
        nextSibling.selectStart()
        return
      }

      const paragraphNode = $createParagraphNode()
      node.insertAfter(paragraphNode)
      paragraphNode.selectStart()
    })
  }

  useEffect(() => {
    if (!autoFocus) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      focusContent()
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isAnnotationNode(node)) {
          node.setAutoFocus(false)
        }
      })
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [autoFocus, editor, nodeKey])

  return (
    <span
      className="my-2 block rounded-[2px] border-[0.5px] border-slate-200 bg-slate-100 px-4 py-3 text-slate-800"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault()
          focusContent()
        }
      }}
    >
      <button
        aria-label="切换标注 emoji"
        className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-lg transition hover:bg-slate-200"
        onClick={cycleEmoji}
        title="点击切换 emoji"
        type="button"
      >
        {normalizedEmoji}
      </button>
      <span
        className="inline-block min-w-[120px] whitespace-pre-wrap align-middle outline-none"
        contentEditable
        onBlur={(event) => updateContent(event.currentTarget.textContent ?? '')}
        onKeyDown={(event) => {
          event.stopPropagation()

          if (event.key !== 'Enter') {
            return
          }

          event.preventDefault()
          const element = event.currentTarget
          const currentLineText = getCurrentLineText(element)

          if (currentLineText.length > 0) {
            document.execCommand('insertLineBreak')
            return
          }

          updateContent(element.textContent ?? '')
          moveCursorBelowAnnotation()
        }}
        onMouseDown={(event) => event.stopPropagation()}
        ref={contentRef}
        suppressContentEditableWarning
      >
        {content}
      </span>
    </span>
  )
}

export class AnnotationNode extends DecoratorNode<JSX.Element> {
  __content: string
  __emoji: string
  __autoFocus: boolean

  static getType(): string {
    return 'annotation'
  }

  static clone(node: AnnotationNode): AnnotationNode {
    return new AnnotationNode(node.__content, node.__emoji, node.__autoFocus, node.__key)
  }

  static importJSON(serializedNode: SerializedAnnotationNode): AnnotationNode {
    return $createAnnotationNode(serializedNode.content, serializedNode.emoji)
  }

  exportJSON(): SerializedAnnotationNode {
    return {
      ...super.exportJSON(),
      content: this.__content,
      emoji: this.__emoji,
      type: 'annotation',
      version: 1,
    }
  }

  constructor(content = '', emoji = '💡', autoFocus = false, key?: NodeKey) {
    super(key)
    this.__content = content
    this.__emoji = emoji
    this.__autoFocus = autoFocus
  }

  createDOM(): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): false {
    return false
  }

  setEmoji(emoji: string): void {
    const writable = this.getWritable()
    writable.__emoji = emoji
  }

  setContent(content: string): void {
    const writable = this.getWritable()
    writable.__content = content
  }

  setAutoFocus(autoFocus: boolean): void {
    const writable = this.getWritable()
    writable.__autoFocus = autoFocus
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return (
      <AnnotationComponent
        autoFocus={this.__autoFocus}
        content={this.__content}
        editor={editor}
        emoji={this.__emoji}
        nodeKey={this.getKey()}
      />
    )
  }
}

export function $createAnnotationNode(content?: string, emoji?: string, autoFocus?: boolean): AnnotationNode {
  return new AnnotationNode(content, emoji, autoFocus)
}

export function $isAnnotationNode(node: LexicalNode | null | undefined): node is AnnotationNode {
  return node instanceof AnnotationNode
}
