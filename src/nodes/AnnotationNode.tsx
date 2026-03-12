import { useMemo, type JSX } from 'react'
import {
  $getNodeByKey,
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
  content,
  editor,
  emoji,
  nodeKey,
}: {
  content: string
  editor: LexicalEditor
  emoji: string
  nodeKey: NodeKey
}) {
  const normalizedEmoji = useMemo(() => (EMOJI_OPTIONS.includes(emoji) ? emoji : '💡'), [emoji])

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

  return (
    <span className="my-2 block rounded-xl bg-slate-100 px-4 py-3 text-slate-800">
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
        className="inline-block min-w-[120px] align-middle outline-none"
        contentEditable
        onBlur={(event) => updateContent(event.currentTarget.textContent ?? '')}
        onInput={(event) => updateContent(event.currentTarget.textContent ?? '')}
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

  static getType(): string {
    return 'annotation'
  }

  static clone(node: AnnotationNode): AnnotationNode {
    return new AnnotationNode(node.__content, node.__emoji, node.__key)
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

  constructor(content = '', emoji = '💡', key?: NodeKey) {
    super(key)
    this.__content = content
    this.__emoji = emoji
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

  decorate(editor: LexicalEditor): JSX.Element {
    return <AnnotationComponent content={this.__content} editor={editor} emoji={this.__emoji} nodeKey={this.getKey()} />
  }
}

export function $createAnnotationNode(content?: string, emoji?: string): AnnotationNode {
  return new AnnotationNode(content, emoji)
}

export function $isAnnotationNode(node: LexicalNode | null | undefined): node is AnnotationNode {
  return node instanceof AnnotationNode
}
