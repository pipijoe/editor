import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
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

const EMOJI_OPTIONS = ['💡', '📝', '✅', '📌', '🔥', '⭐️', '⚠️', '🎯']

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    const element = contentRef.current
    if (!element) {
      return
    }

    // Keep contentEditable text in sync without letting React control caret position.
    if (element.textContent !== content) {
      element.textContent = content
    }
  }, [content])

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

  const setEmoji = (nextEmoji: string) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isAnnotationNode(node)) {
        node.setEmoji(nextEmoji)
      }
    })
  }

  const updateContent = (nextContent: string) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isAnnotationNode(node)) {
        node.setContent(nextContent)
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

    const afterRange = document.createRange()
    afterRange.selectNodeContents(element)
    afterRange.setStart(range.startContainer, range.startOffset)

    const beforeLines = beforeRange.toString().split('\n')
    const beforeLine = beforeLines[beforeLines.length - 1] ?? ''
    const afterLine = afterRange.toString().split('\n')[0] ?? ''

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

    window.requestAnimationFrame(() => {
      editor.focus()
    })
  }

  const removeAnnotation = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if (!$isAnnotationNode(node)) {
        return
      }

      const nextSibling = node.getNextSibling()
      const previousSibling = node.getPreviousSibling()
      node.remove()

      if ($isParagraphNode(nextSibling)) {
        nextSibling.selectStart()
        return
      }

      if ($isParagraphNode(previousSibling)) {
        previousSibling.selectEnd()
        return
      }

      const paragraphNode = $createParagraphNode()
      if (nextSibling) {
        nextSibling.insertBefore(paragraphNode)
      } else if (previousSibling) {
        previousSibling.insertAfter(paragraphNode)
      }

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

  useEffect(() => {
    if (!showEmojiPicker) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showEmojiPicker])

  return (
    <div
      className="relative my-2 block rounded-[2px] border-[0.5px] border-slate-200 bg-slate-100 px-4 py-3 text-slate-800"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault()
          focusContent()
        }
      }}
      ref={containerRef}
    >
      <div className="absolute left-3 top-3">
        <button
          aria-expanded={showEmojiPicker}
          aria-haspopup="menu"
          aria-label="选择标注 emoji"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-lg transition hover:bg-slate-200"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          onMouseDown={(event) => event.preventDefault()}
          title="点击选择 emoji"
          type="button"
        >
          {normalizedEmoji}
        </button>

        {showEmojiPicker && (
          <div className="absolute left-0 top-8 z-20 w-44 rounded-md border border-slate-200 bg-white p-2 shadow-lg" role="menu">
            <div className="grid grid-cols-4 gap-1">
              {EMOJI_OPTIONS.map((emojiOption) => (
                <button
                  aria-label={`切换为 ${emojiOption}`}
                  className={`rounded px-1 py-1 text-lg transition hover:bg-slate-100 ${emojiOption === normalizedEmoji ? 'bg-slate-100' : ''}`}
                  key={emojiOption}
                  onClick={() => {
                    setEmoji(emojiOption)
                    setShowEmojiPicker(false)
                    focusContent()
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  role="menuitem"
                  type="button"
                >
                  {emojiOption}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <span
        className="block min-h-7 min-w-[120px] whitespace-pre-wrap pl-9 align-middle outline-none"
        contentEditable
        onBlur={(event) => updateContent(event.currentTarget.textContent ?? '')}
        onInput={(event) => updateContent(event.currentTarget.textContent ?? '')}
        onKeyDown={(event) => {
          event.stopPropagation()

          if ((event.key === 'Backspace' || event.key === 'Delete') && (event.currentTarget.textContent ?? '').trim().length === 0) {
            event.preventDefault()
            removeAnnotation()
            return
          }

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
      />
    </div>
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
    return document.createElement('div')
  }

  isInline(): boolean {
    return false
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
