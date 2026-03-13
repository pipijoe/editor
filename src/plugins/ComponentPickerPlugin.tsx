import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $insertNodes } from 'lexical'

import { $createAnnotationNode } from '@/nodes/AnnotationNode'
import { $createEquationNode } from '@/nodes/EquationNode'
import { $createNoteLinkCardNode, type NoteLinkData } from '@/nodes/NoteLinkCardNode'

type SlashCommand = 'math' | 'annotation' | 'connect-note'

const MOCK_NOTES: Array<NoteLinkData> = [
  {
    id: 'product-roadmap-q2',
    title: 'Q2 产品路线图',
    path: '/产品规划/2026/Q2',
    updatedAt: '2026-03-05T11:20:00+08:00',
    url: '/notes/product-roadmap-q2',
  },
  {
    id: 'weekly-review-0309',
    title: '周会复盘：03/09',
    path: '/团队协作/周会记录',
    updatedAt: '2026-03-09T18:45:00+08:00',
    url: '/notes/weekly-review-0309',
  },
  {
    id: 'ux-research-insight',
    title: 'UX 调研洞察：编辑器行为',
    path: '/研究/用户体验',
    updatedAt: '2026-03-07T09:30:00+08:00',
    url: '/notes/ux-research-insight',
  },
  {
    id: 'meeting-notes-ai',
    title: 'AI 编辑器需求评审',
    path: '/会议纪要/产品评审',
    updatedAt: '2026-03-10T15:10:00+08:00',
    url: '/notes/meeting-notes-ai',
  },
]

function formatUpdatedAt(updatedAt: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(updatedAt))
}

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
  const [noteQuery, setNoteQuery] = useState('')
  const selectedNoteRef = useRef<NoteLinkData | null>(null)

  const checkForSlashMatch = useBasicTypeaheadTriggerMatch('/', { minLength: 0 })

  const options = useMemo(
    () => [
      new SlashOption('公式', '插入可编辑公式块（支持 /math）', ['equation', 'math', 'latex', '公式'], 'math'),
      new SlashOption('标注', '插入可编辑标注块（支持 /annotation）', ['annotation', 'highlight', 'mark', 'note', '标注', '高亮'], 'annotation'),
      new SlashOption('连接到笔记', '搜索笔记并插入可双击跳转的笔记卡片（支持 /note）', ['note', 'link', '连接', '笔记', '关联'], 'connect-note'),
    ],
    [],
  )

  const matchedNotes = useMemo(() => {
    const normalizedQuery = noteQuery.trim().toLowerCase()
    return MOCK_NOTES.slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .filter((note) => {
        if (!normalizedQuery) {
          return true
        }

        return [note.title, note.path].some((value) => value.toLowerCase().includes(normalizedQuery))
      })
  }, [noteQuery])

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

  const insertAnnotationBlock = () => {
    editor.update(() => {
      const annotationNode = $createAnnotationNode('', '💡', true)
      $insertNodes([annotationNode, $createParagraphNode()])
    })
    setQueryString(null)
  }

  const insertNoteLinkCard = (note: NoteLinkData) => {
    editor.update(() => {
      const noteCardNode = $createNoteLinkCardNode(note)
      $insertNodes([noteCardNode, $createParagraphNode()])
    })
    setQueryString(null)
    setNoteQuery('')
    selectedNoteRef.current = null
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

          if (selectedOption.command === 'annotation') {
            insertAnnotationBlock()
          }

          if (selectedOption.command === 'connect-note' && selectedNoteRef.current) {
            insertNoteLinkCard(selectedNoteRef.current)
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
              <div className="w-[600px] max-w-[92vw] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                {filteredOptions.map((option, index) => (
                  <button
                    className={`flex w-full flex-col items-start rounded px-3 py-2 text-left ${index === selectedIndex ? 'bg-slate-100' : ''}`}
                    key={option.key}
                    onClick={() => {
                      if (option.command === 'connect-note') {
                        setHighlightedIndex(index)
                        setHoveredCommand('connect-note')
                        return
                      }

                      selectOptionAndCleanUp(option)
                    }}
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

              {hoveredCommand === 'annotation' && (
                <div className="w-[200px] max-w-[40vw] rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-medium text-slate-500">页面效果预览</p>
                  <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                    <span className="mr-1">💡</span> 点击 emoji 可切换标注图标
                  </p>
                </div>
              )}

              {hoveredCommand === 'connect-note' && (
                <div className="w-[640px] max-w-[72vw] rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-xs font-medium text-slate-500">连接到笔记</p>
                  <input
                    className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
                    onChange={(event) => setNoteQuery(event.target.value)}
                    placeholder="搜索笔记标题或路径"
                    value={noteQuery}
                  />
                  <div className="max-h-56 space-y-1 overflow-auto">
                    {matchedNotes.length > 0 ? (
                      matchedNotes.map((note) => (
                        <button
                          className="w-full rounded-md border border-transparent px-2 py-2 text-left transition hover:border-blue-100 hover:bg-blue-50"
                          key={note.id}
                          onClick={() => {
                            selectedNoteRef.current = note
                            selectOptionAndCleanUp(options.find((option) => option.command === 'connect-note') as SlashOption)
                          }}
                          type="button"
                        >
                          <p className="text-sm font-medium text-slate-900">{note.title}</p>
                          <p className="text-xs text-slate-500">{note.path}</p>
                          <p className="mt-1 text-[11px] text-slate-400">最近更新：{formatUpdatedAt(note.updatedAt)}</p>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-md bg-slate-50 px-2 py-4 text-center text-xs text-slate-500">没有匹配的笔记</p>
                    )}
                  </div>
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
