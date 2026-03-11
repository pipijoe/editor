import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react'
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
  const [editing, setEditing] = useState(formula.trim().length === 0)
  const [value, setValue] = useState(formula)
  const [katexRenderer, setKatexRenderer] = useState<KaTeXRenderer | null>(null)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)

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

  useEffect(() => {
    setValue(formula)
    if (formula.trim().length === 0) {
      setEditing(true)
    }
  }, [formula])

  useEffect(() => {
    if (!editing) {
      return
    }

    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setValue(formula)
        setEditing(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [editing, formula])

  const renderedFormula = useMemo(() => {
    if (!katexRenderer || formula.trim().length === 0) {
      return null
    }

    return katexRenderer.renderToString(formula, {
      displayMode: true,
      throwOnError: false,
      errorColor: '#dc2626',
    })
  }, [formula, katexRenderer])

  const saveFormula = () => {
    const nextFormula = value.trim()
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

  return (
    <span className="relative my-2 block w-full" ref={wrapperRef}>
      <button
        className={`block w-full rounded-lg border px-3 py-2 text-left transition ${
          editing
            ? 'border-indigo-200 bg-indigo-50/40'
            : 'border-transparent hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-sm'
        }`}
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
            <span className="block text-center text-sm text-slate-400">点击输入公式</span>
          )}
        </span>
      </button>

      {editing && (
        <span className="absolute left-1/2 top-full z-20 mt-2 block w-full max-w-xl -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs text-slate-500">编辑公式（Ctrl/Cmd + Enter 保存）</p>
          <textarea
            autoFocus
            className="h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-slate-400"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="例如：\\frac{a}{b} 或 x^2+y^2=z^2"
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
      )}
    </span>
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

  constructor(formula = '', key?: NodeKey) {
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
