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

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
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
      <span className="my-2 inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1">
        <span className="text-xs text-indigo-700">公式</span>
        <input
          autoFocus
          className="w-52 rounded border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onInputKeyDown}
          value={value}
        />
        <button className="text-xs font-medium text-indigo-700" onClick={saveFormula} type="button">
          保存
        </button>
      </span>
    )
  }

  return (
    <button
      className="my-2 inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-mono text-sm text-indigo-700"
      onClick={() => {
        setValue(formula)
        setEditing(true)
      }}
      title="点击编辑公式"
      type="button"
    >
      {`$${formula}$`}
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
