import type { JSX } from 'react'
import { DecoratorNode, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical'

export type NoteLinkData = {
  id: string
  title: string
  path: string
  updatedAt: string
  url: string
}

type SerializedNoteLinkCardNode = Spread<
  {
    note: NoteLinkData
    type: 'note-link-card'
    version: 1
  },
  SerializedLexicalNode
>

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function NoteLinkCard({ note }: { note: NoteLinkData }) {
  const handleDoubleClick = () => {
    window.location.href = note.url
  }

  return (
    <article
      className="my-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow"
      onDoubleClick={handleDoubleClick}
      role="link"
      tabIndex={0}
      title="双击跳转到笔记"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">连接到笔记</p>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{note.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{note.path}</p>
      <p className="mt-2 text-xs text-slate-500">最近更新：{formatDate(note.updatedAt)}</p>
    </article>
  )
}

export class NoteLinkCardNode extends DecoratorNode<JSX.Element> {
  __note: NoteLinkData

  static getType(): string {
    return 'note-link-card'
  }

  static clone(node: NoteLinkCardNode): NoteLinkCardNode {
    return new NoteLinkCardNode(node.getNote(), node.__key)
  }

  static importJSON(serializedNode: SerializedNoteLinkCardNode): NoteLinkCardNode {
    return $createNoteLinkCardNode(serializedNode.note)
  }

  exportJSON(): SerializedNoteLinkCardNode {
    return {
      ...super.exportJSON(),
      note: this.getNote(),
      type: 'note-link-card',
      version: 1,
    }
  }

  constructor(note: NoteLinkData, key?: NodeKey) {
    super(key)
    this.__note = note
  }

  createDOM(): HTMLElement {
    return document.createElement('div')
  }

  updateDOM(): false {
    return false
  }

  getNote(): NoteLinkData {
    return this.getLatest().__note
  }

  decorate(): JSX.Element {
    return <NoteLinkCard note={this.getNote()} />
  }
}

export function $createNoteLinkCardNode(note: NoteLinkData): NoteLinkCardNode {
  return new NoteLinkCardNode(note)
}

export function $isNoteLinkCardNode(node: LexicalNode | null | undefined): node is NoteLinkCardNode {
  return node instanceof NoteLinkCardNode
}
