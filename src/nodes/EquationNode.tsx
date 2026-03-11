import { useEffect, useMemo, useState, type JSX, type KeyboardEvent } from 'react'
import {
  $getNodeByKey,
  DecoratorNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'

type SerializedEquationNode = Spread<
  {
    formula: string
    type: 'equation'
    version: 1
  },
  SerializedLexicalNode
>

type KaTeXRenderer = {
  renderToString: (formula: string, options?: { displayMode?: boolean; throwOnError?: boolean; errorColor?: string }) => string
}

declare global {
  interface Window {
    katex?: KaTeXRenderer
  }
}

let katexLoaderPromise: Promise<KaTeXRenderer | null> | null = null

function loadKaTeX(): Promise<KaTeXRenderer | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (window.katex) {
    return Promise.resolve(window.katex)
  }

  if (katexLoaderPromise) {
    return katexLoaderPromise
  }

  katexLoaderPromise = new Promise((resolve) => {
    if (!document.querySelector('link[data-katex-stylesheet="true"]')) {
      const stylesheet = document.createElement('link')
      stylesheet.rel = 'stylesheet'
      stylesheet.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
      stylesheet.setAttribute('data-katex-stylesheet', 'true')
      document.head.appendChild(stylesheet)
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js'
    script.async = true
    script.onload = () => resolve(window.katex ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })

  return katexLoaderPromise
}

function EquationComponent({ formula, nodeKey, editor }: { formula: string; nodeKey: NodeKey; editor: LexicalEditor }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(formula)
  const [katexRenderer, setKatexRenderer] = useState<KaTeXRenderer | null>(null)

  useEffect(() => {
    let active = true

    loadKaTeX().then((renderer) => {
      if (active) {
        setKatexRenderer(renderer)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const renderedFormula = useMemo(() => {
    if (!katexRenderer) {
      return null
    }

    return katexRenderer.renderToString(formula, {
      displayMode: true,
      throwOnError: false,
      errorColor: '#dc2626',
    })
  }, [formula, katexRenderer])

  const saveFormula = () => {
    const nextFormula = value.trim() || 'x^2'
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isEquationNode(node)) {
        node.setFormula(nextFormula)
      }
    })
    setEditing(false)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      saveFormula()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setValue(formula)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <span className="my-2 block rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs text-slate-500">编辑公式（Ctrl/Cmd + Enter 保存）</p>
        <textarea
          autoFocus
          className="h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-slate-400"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onInputKeyDown}
          value={value}
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            className="text-xs font-medium text-slate-600"
            onClick={() => {
              setValue(formula)
              setEditing(false)
            }}
            type="button"
          >
            取消
          </button>
          <button className="text-xs font-medium text-indigo-700" onClick={saveFormula} type="button">
            保存
          </button>
        </div>
      </span>
    )
  }

  return (
    <button
      className="my-2 block w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-slate-200 hover:bg-slate-50"
      onClick={() => {
        setValue(formula)
        setEditing(true)
      }}
      title="点击编辑公式"
      type="button"
    >
      <span className="block overflow-x-auto rounded-md bg-slate-50 px-3 py-2 text-slate-800">
        {renderedFormula ? (
          <span className="flex justify-center" dangerouslySetInnerHTML={{ __html: renderedFormula }} />
        ) : (
          <span className="block text-center font-serif text-lg">{formula}</span>
        )}
      </span>
    </button>
  )
}

export class EquationNode extends DecoratorNode<JSX.Element> {
  __formula: string

  static getType(): string {
    return 'equation'
  }

  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__formula, node.__key)
  }

  static importJSON(serializedNode: SerializedEquationNode): EquationNode {
    return $createEquationNode(serializedNode.formula)
  }

  exportJSON(): SerializedEquationNode {
    return {
      ...super.exportJSON(),
      formula: this.__formula,
      type: 'equation',
      version: 1,
    }
  }

  constructor(formula = 'x^2', key?: NodeKey) {
    super(key)
    this.__formula = formula
  }

  createDOM(): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): false {
    return false
  }

  setFormula(formula: string): void {
    const writable = this.getWritable()
    writable.__formula = formula
  }

  decorate(editor: LexicalEditor): JSX.Element {
    return <EquationComponent editor={editor} formula={this.__formula} nodeKey={this.getKey()} />
  }
}

export function $createEquationNode(formula?: string): EquationNode {
  return new EquationNode(formula)
}

export function $isEquationNode(node: LexicalNode | null | undefined): node is EquationNode {
  return node instanceof EquationNode
}
