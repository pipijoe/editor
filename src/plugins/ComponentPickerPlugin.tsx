import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $insertNodes } from 'lexical'

import { $createAnnotationNode } from '@/nodes/AnnotationNode'
import { $createEquationNode } from '@/nodes/EquationNode'

type SlashCommand = 'math' | 'highlight'

class SlashOption extends MenuOption {
  label: string
  keywords: Array<string>
  description: string
  command: SlashCommand

  constructor(label: string, description: string, keywords: Array<string>, command: SlashCommand) {
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
  const [hoveredCommand, setHoveredCommand] = useState<SlashCommand | null>(null)

  const checkForSlashMatch = useBasicTypeaheadTriggerMatch('/', { minLength: 0 })

  const options = useMemo(
    () => [
      new SlashOption('公式', '插入可编辑公式块（支持 /math）', ['equation', 'math', 'latex', '公式'], 'math'),
      new SlashOption('标注', '插入可编辑标注块（支持 /highlight）', ['highlight', 'mark', 'note', '标注', '高亮'], 'highlight'),
    ],
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
    editor.update(() => {
      const equationNode = $createEquationNode('')
      $insertNodes([equationNode, $createParagraphNode()])
    })
    setQueryString(null)
  }

  const insertHighlightText = () => {
    editor.update(() => {
      const annotationNode = $createAnnotationNode('', '💡')
      $insertNodes([annotationNode, $createParagraphNode()])
    })
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
            insertMathNode()
          }

          if (selectedOption.command === 'highlight') {
            insertHighlightText()
          }

          closeMenu()
        }}
        options={filteredOptions}
        menuRenderFn={(anchorElementRef, { selectedIndex, setHighlightedIndex, selectOptionAndCleanUp }) => {
          if (!anchorElementRef.current || filteredOptions.length === 0) {
            return null
          }

          return createPortal(
            <div className="z-30 mt-1 flex max-w-[92vw] items-start gap-2">
              <div className="w-[300px] max-w-[92vw] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                {filteredOptions.map((option, index) => (
                  <button
                    className={`flex w-full flex-col items-start rounded px-3 py-2 text-left ${index === selectedIndex ? 'bg-slate-100' : ''}`}
                    key={option.key}
                    onClick={() => selectOptionAndCleanUp(option)}
                    onMouseEnter={() => {
                      setHighlightedIndex(index)
                      setHoveredCommand(option.command)
                    }}
                    onMouseLeave={() => setHoveredCommand((prev) => (prev === option.command ? null : prev))}
                    type="button"
                  >
                    <span className="text-sm font-medium text-slate-900">{option.label}</span>
                    <span className="text-xs text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>

              {hoveredCommand === 'highlight' && (
                <div className="w-[200px] max-w-[40vw] rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-medium text-slate-500">页面效果预览</p>
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                    <span className="mr-1">💡</span> 点击后输入内容
                  </p>
                </div>
              )}
            </div>,
            anchorElementRef.current,
          )
        }}
        triggerFn={checkForSlashMatch}
      />
    </>
  )
}
