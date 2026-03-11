import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $insertNodes } from 'lexical'

import { $createEquationNode } from '@/nodes/EquationNode'
import { Button } from '@/components/ui/button'

class SlashOption extends MenuOption {
  label: string
  keywords: Array<string>
  description: string
  command: 'math'

  constructor(label: string, description: string, keywords: Array<string>, command: 'math') {
    super(command)
    this.label = label
    this.description = description
    this.keywords = keywords
    this.command = command
  }
}

export function ComponentPickerPlugin() {
  const [editor] = useLexicalComposerContext()
  const [queryString, setQueryString] = useState<string | null>(null)
  const [showMathDialog, setShowMathDialog] = useState(false)
  const [mathFormula, setMathFormula] = useState('x^2+y^2=z^2')

  const checkForSlashMatch = useBasicTypeaheadTriggerMatch('/', { minLength: 0 })

  const options = useMemo(
    () => [new SlashOption('公式', '插入可编辑公式块（支持 /math）', ['equation', 'math', 'latex', '公式'], 'math')],
    [],
  )

  const filteredOptions = useMemo(() => {
    if (!queryString) {
      return options
    }

    const lowerQuery = queryString.toLowerCase()
    return options.filter((option) => option.label.includes(queryString) || option.keywords.some((keyword) => keyword.includes(lowerQuery)))
  }, [options, queryString])

  const insertMathNode = () => {
    const formula = mathFormula.trim() || 'x^2'
    editor.update(() => {
      const equationNode = $createEquationNode(formula)
      $insertNodes([equationNode, $createParagraphNode()])
    })
    setShowMathDialog(false)
    setQueryString(null)
  }

  return (
    <>
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={(selectedOption, nodeToRemove, closeMenu) => {
          editor.update(() => {
            if (nodeToRemove) {
              nodeToRemove.remove()
            }
          })

          if (selectedOption.command === 'math') {
            setShowMathDialog(true)
          }

          closeMenu()
        }}
        options={filteredOptions}
        menuRenderFn={(anchorElementRef, { selectedIndex, setHighlightedIndex, selectOptionAndCleanUp }) => {
          if (!anchorElementRef.current || filteredOptions.length === 0) {
            return null
          }

          return createPortal(
            <div className="z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              {filteredOptions.map((option, index) => (
                <button
                  className={`flex w-full flex-col items-start rounded px-3 py-2 text-left ${index === selectedIndex ? 'bg-slate-100' : ''}`}
                  key={option.key}
                  onClick={() => selectOptionAndCleanUp(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  type="button"
                >
                  <span className="text-sm font-medium text-slate-900">{option.label}</span>
                  <span className="text-xs text-slate-500">{option.description}</span>
                </button>
              ))}
            </div>,
            anchorElementRef.current,
          )
        }}
        triggerFn={checkForSlashMatch}
      />

      {showMathDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">插入公式</h3>
            <p className="mt-1 text-sm text-slate-500">输入 LaTeX 或普通表达式，确认后将插入公式块。</p>
            <textarea
              autoFocus
              className="mt-3 h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-slate-400"
              onChange={(event) => setMathFormula(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  insertMathNode()
                }
              }}
              placeholder="例如：\\frac{a}{b} 或 x^2+y^2=z^2"
              value={mathFormula}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowMathDialog(false)
                  setQueryString(null)
                }}
                type="button"
                variant="outline"
              >
                取消
              </Button>
              <Button onClick={insertMathNode} type="button">
                插入
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
