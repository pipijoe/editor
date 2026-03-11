import { type MouseEvent, type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type EditorState,
  type RangeSelection,
} from 'lexical'
import { $patchStyleText, $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, HeadingNode } from '@lexical/rich-text'
import { LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'

import { LinkPreviewCardNode, $createLinkPreviewCardNode } from '@/nodes/LinkPreviewCardNode'
import { EquationNode } from '@/nodes/EquationNode'
import { AutoLinkCardPlugin, fetchLinkCard, normalizeUrl } from '@/plugins/AutoLinkCardPlugin'
import { ComponentPickerPlugin } from '@/plugins/ComponentPickerPlugin'
import { Button } from '@/components/ui/button'

type SelectionPosition = {
  top: number
  left: number
}

type IconProps = {
  className?: string
}

function LucideIcon({ children, className }: PropsWithChildren<IconProps>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

const BoldIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
    <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
  </LucideIcon>
)

const ItalicIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </LucideIcon>
)

const ParagraphIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M13 4v16" />
    <path d="M17 4v16" />
    <path d="M19 4H9a4 4 0 0 0 0 8h4" />
  </LucideIcon>
)

const Heading1Icon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="m17 12 3-2v8" />
  </LucideIcon>
)

const Heading2Icon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M17 13.5a2.5 2.5 0 1 0-1-4.5" />
    <path d="M16 19h5" />
    <path d="M21 19v-1.5a2.5 2.5 0 0 0-5 0V19" />
  </LucideIcon>
)

const Heading3Icon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M17.5 10.5a2.5 2.5 0 1 1 3 4" />
    <path d="M17 17a2.5 2.5 0 1 0 3.5 2" />
  </LucideIcon>
)

const PaletteIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <circle cx="13.5" cy="6.5" r=".5" />
    <circle cx="17.5" cy="10.5" r=".5" />
    <circle cx="8.5" cy="7.5" r=".5" />
    <circle cx="6.5" cy="12.5" r=".5" />
    <path d="M12 22a1 1 0 0 1 0-9h1a4 4 0 0 0 0-8 9 9 0 0 0 0 18Z" />
  </LucideIcon>
)

const LinkIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L10.2 6.74" />
    <path d="M14 11a5 5 0 0 0-7.54-.54L4.54 12.38a5 5 0 0 0 7.07 7.07l2.19-2.18" />
  </LucideIcon>
)

const XIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </LucideIcon>
)

const CheckIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M20 6 9 17l-5-5" />
  </LucideIcon>
)

const CardIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <rect height="14" rx="2" width="20" x="2" y="5" />
    <path d="M6 9h12" />
    <path d="M6 13h6" />
  </LucideIcon>
)

const LoaderIcon = ({ className }: IconProps) => (
  <LucideIcon className={className}>
    <path d="M21 12a9 9 0 1 1-6.2-8.56" />
  </LucideIcon>
)

const initialConfig = {
  namespace: 'basic-editor',
  nodes: [HeadingNode, LinkNode, LinkPreviewCardNode, EquationNode],
  theme: {
    paragraph: 'mb-2',
    link: 'text-blue-600 underline',
    text: {
      bold: 'font-semibold',
      italic: 'italic',
      underline: 'underline',
    },
  },
  onError(error: Error) {
    throw error
  },
}

const COLOR_OPTIONS = [
  { label: '深灰', value: '#0f172a' },
  { label: '红色', value: '#dc2626' },
  { label: '橙色', value: '#ea580c' },
  { label: '琥珀', value: '#d97706' },
  { label: '黄色', value: '#ca8a04' },
  { label: '绿色', value: '#16a34a' },
  { label: '青色', value: '#0d9488' },
  { label: '天蓝', value: '#0284c7' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#7c3aed' },
  { label: '粉色', value: '#db2777' },
  { label: '棕色', value: '#7c2d12' },
]

function FloatingSelectionToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [showMenu, setShowMenu] = useState(false)
  const [showLinkEditor, setShowLinkEditor] = useState(false)
  const [selectionPosition, setSelectionPosition] = useState<SelectionPosition>({ top: 0, left: 0 })
  const [linkInput, setLinkInput] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [converting, setConverting] = useState(false)
  const [linkError, setLinkError] = useState('')
  const selectionRef = useRef<RangeSelection | null>(null)

  const preventMouseDownBlur = (event: MouseEvent) => {
    event.preventDefault()
  }

  const openLinkEditor = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        selectionRef.current = selection.clone()
        setSelectedText(selection.getTextContent())
      }
    })

    setShowLinkEditor(true)
  }

  const updateSelectionState = useCallback(() => {
    const selection = $getSelection()

    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      setShowMenu(false)
      setShowLinkEditor(false)
      setSelectedText('')
      return
    }

    const domSelection = window.getSelection()
    if (!domSelection || domSelection.rangeCount === 0) {
      setShowMenu(false)
      return
    }

    const rect = domSelection.getRangeAt(0).getBoundingClientRect()
    if (!rect.width && !rect.height) {
      setShowMenu(false)
      return
    }

    selectionRef.current = selection.clone()
    setSelectedText(selection.getTextContent().trim())
    setSelectionPosition({
      top: rect.top + window.scrollY - 10,
      left: rect.left + window.scrollX + rect.width / 2,
    })
    setShowMenu(true)
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateSelectionState)
        return false
      },
      1,
    )
  }, [editor, updateSelectionState])

  const applyTextColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color })
      }
    })
  }

  const applyHeading = (tag: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const applyParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const submitLink = () => {
    const normalizedUrl = normalizeUrl(linkInput)
    if (!normalizedUrl) {
      return
    }

    editor.update(() => {
      if (!selectionRef.current) {
        return
      }
      $setSelection(selectionRef.current.clone())
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalizedUrl)
    })

    setShowLinkEditor(false)
    setLinkInput('')
    setLinkError('')
  }

  const convertToCard = async () => {
    const normalizedUrl = normalizeUrl(linkInput)
    if (!normalizedUrl) {
      return
    }

    setConverting(true)
    setLinkError('')
    try {
      const card = await fetchLinkCard(normalizedUrl)
      const cardTitle = selectionRef.current?.getTextContent() || selectedText || card.title

      editor.update(() => {
        const selection = selectionRef.current?.clone() ?? $getSelection()
        const cardNode = $createLinkPreviewCardNode({
          ...card,
          title: cardTitle,
          url: normalizedUrl,
        })

        if ($isRangeSelection(selection)) {
          $setSelection(selection)
          selection.insertNodes([cardNode])
          return
        }

        $getRoot().append(cardNode)
      })

      setShowLinkEditor(false)
      setShowMenu(false)
      setLinkInput('')
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : '链接转换失败，请稍后重试')
    } finally {
      setConverting(false)
    }
  }

  if (!showMenu) {
    return null
  }

  return (
    <>
      <div
        className="fixed z-20 flex -translate-x-1/2 -translate-y-full flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        style={{ left: selectionPosition.left, top: selectionPosition.top }}
      >
        <Button aria-label="加粗" size="sm" title="加粗" variant="outline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} type="button">
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button aria-label="斜体" size="sm" title="斜体" variant="outline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} type="button">
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button aria-label="正文" size="sm" title="正文" variant="outline" onClick={applyParagraph} type="button">
          <ParagraphIcon className="h-4 w-4" />
        </Button>
        <Button aria-label="标题 1" size="sm" title="标题 1" variant="outline" onClick={() => applyHeading('h1')} type="button">
          <Heading1Icon className="h-4 w-4" />
        </Button>
        <Button aria-label="标题 2" size="sm" title="标题 2" variant="outline" onClick={() => applyHeading('h2')} type="button">
          <Heading2Icon className="h-4 w-4" />
        </Button>
        <Button aria-label="标题 3" size="sm" title="标题 3" variant="outline" onClick={() => applyHeading('h3')} type="button">
          <Heading3Icon className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1" title="字体颜色">
          <PaletteIcon className="h-4 w-4 text-slate-500" />
          <div className="grid grid-cols-6 gap-1">
            {COLOR_OPTIONS.map((option) => (
              <button
                aria-label={option.label}
                className="h-4 w-4 rounded-full border border-slate-300"
                key={option.value}
                onClick={() => applyTextColor(option.value)}
                style={{ backgroundColor: option.value }}
                title={option.label}
                type="button"
              />
            ))}
          </div>
        </div>

        <Button
          aria-label="设置链接"
          size="sm"
          title="设置链接"
          variant="outline"
          onMouseDown={preventMouseDownBlur}
          onClick={openLinkEditor}
          type="button"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {showLinkEditor && (
        <div className="fixed z-30 -translate-x-1/2" style={{ left: selectionPosition.left, top: selectionPosition.top + 8 }}>
          <div className="flex gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
            <input
            className="w-72 rounded border border-slate-300 px-3 py-1.5 text-sm"
            onChange={(event) => {
              setLinkInput(event.target.value)
              if (linkError) {
                setLinkError('')
              }
            }}
            placeholder="输入链接 URL"
            value={linkInput}
            />
            <Button
            aria-label="取消"
            size="sm"
            title="取消"
            variant="outline"
            onMouseDown={preventMouseDownBlur}
            onClick={() => {
              setShowLinkEditor(false)
              setLinkInput('')
              setLinkError('')
            }}
            type="button"
          >
            <XIcon className="h-4 w-4" />
            </Button>
            <Button aria-label="确认" size="sm" title="确认" onMouseDown={preventMouseDownBlur} onClick={submitLink} type="button" variant="outline">
            <CheckIcon className="h-4 w-4" />
            </Button>
            <Button
              aria-label="转化为卡片"
              disabled={converting}
              size="sm"
              title="转化为卡片"
              onMouseDown={preventMouseDownBlur}
              onClick={() => void convertToCard()}
              type="button"
            >
              {converting ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <CardIcon className="h-4 w-4" />}
            </Button>
          </div>
          {linkError && <p className="mt-1 px-1 text-xs text-red-600">{linkError}</p>}
        </div>
      )}
    </>
  )
}

export default function App() {
  const [content, setContent] = useState('')
  const editorContentClasses = useMemo(
    () => 'min-h-52 rounded-md border border-slate-200 bg-white p-3 text-slate-900 outline-none',
    [],
  )

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        setContent(selection.getTextContent())
      }
    })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center p-6">
      <section className="w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Lexical 基础编辑器</h1>
        <LexicalComposer initialConfig={initialConfig}>
          <FloatingSelectionToolbarPlugin />
          <RichTextPlugin
            contentEditable={<ContentEditable className={editorContentClasses} />}
            placeholder={<p className="pointer-events-none -mt-9 px-3 text-slate-400">输入 / 唤起命令菜单，选择「公式」可插入可编辑公式</p>}
            ErrorBoundary={({ children }) => <>{children}</>}
          />
          <HistoryPlugin />
          <LinkPlugin />
          <ClickableLinkPlugin newTab />
          <AutoLinkCardPlugin />
          <ComponentPickerPlugin />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">当前选中文本：{content || '（暂无）'}</div>
      </section>
    </main>
  )
}
