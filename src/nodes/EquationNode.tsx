import { useState, type JSX, type KeyboardEvent } from 'react'
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

function EquationComponent({ formula, nodeKey, editor }: { formula: string; nodeKey: NodeKey; editor: LexicalEditor }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(formula)

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
      <span className="block overflow-x-auto rounded-md bg-slate-50 px-3 py-2 font-serif text-lg text-slate-800">{formula}</span>
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
