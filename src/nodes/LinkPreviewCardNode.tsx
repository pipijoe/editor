import type { JSX } from 'react'
import {
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'

export type LinkCardData = {
  url: string
  title: string
  description: string
  siteName: string
  image?: string
}

type SerializedLinkPreviewCardNode = Spread<
  {
    card: LinkCardData
    type: 'link-preview-card'
    version: 1
  },
  SerializedLexicalNode
>

function LinkPreviewCard({ card }: { card: LinkCardData }) {
  return (
    <article className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm transition-shadow hover:shadow-md">
      {card.image && <img src={card.image} alt={card.title} className="h-36 w-full object-cover" />}
      <div className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.siteName}</p>
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{card.title}</h3>
        <p className="line-clamp-3 text-sm text-slate-600">{card.description}</p>
        <a className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-500" href={card.url} target="_blank" rel="noreferrer">
          访问链接 ↗
        </a>
      </div>
    </article>
  )
}

export class LinkPreviewCardNode extends DecoratorNode<JSX.Element> {
  __card: LinkCardData

  static getType(): string {
    return 'link-preview-card'
  }

  static clone(node: LinkPreviewCardNode): LinkPreviewCardNode {
    return new LinkPreviewCardNode(node.__card, node.__key)
  }

  static importJSON(serializedNode: SerializedLinkPreviewCardNode): LinkPreviewCardNode {
    return $createLinkPreviewCardNode(serializedNode.card)
  }

  exportJSON(): SerializedLinkPreviewCardNode {
    return {
      ...super.exportJSON(),
      card: this.__card,
      type: 'link-preview-card',
      version: 1,
    }
  }

  constructor(card: LinkCardData, key?: NodeKey) {
    super(key)
    this.__card = card
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div')
    return element
  }

  updateDOM(): false {
    return false
  }

  decorate(): JSX.Element {
    return <LinkPreviewCard card={this.__card} />
  }
}

export function $createLinkPreviewCardNode(card: LinkCardData): LinkPreviewCardNode {
  return new LinkPreviewCardNode(card)
}

export function $isLinkPreviewCardNode(node: LexicalNode | null | undefined): node is LinkPreviewCardNode {
  return node instanceof LinkPreviewCardNode
}
