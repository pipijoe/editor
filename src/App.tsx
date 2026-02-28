import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
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
import { AutoLinkCardPlugin, fetchLinkCard } from '@/plugins/AutoLinkCardPlugin'
import { Button } from '@/components/ui/button'

type SelectionPosition = {
  top: number
  left: number
}

const initialConfig = {
  namespace: 'basic-editor',
  nodes: [HeadingNode, LinkNode, LinkPreviewCardNode],
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
  { label: '黑色', value: '#0f172a' },
  { label: '红色', value: '#dc2626' },
  { label: '蓝色', value: '#2563eb' },
  { label: '绿色', value: '#16a34a' },
]

function FloatingSelectionToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [showMenu, setShowMenu] = useState(false)
  const [showLinkEditor, setShowLinkEditor] = useState(false)
  const [selectionPosition, setSelectionPosition] = useState<SelectionPosition>({ top: 0, left: 0 })
  const [linkInput, setLinkInput] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [converting, setConverting] = useState(false)
  const selectionRef = useRef<RangeSelection | null>(null)

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
    if (!linkInput.trim()) {
      return
    }

    editor.update(() => {
      if (!selectionRef.current) {
        return
      }
      $setSelection(selectionRef.current.clone())
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkInput.trim())
    })

    setShowLinkEditor(false)
    setLinkInput('')
  }

  const convertToCard = async () => {
    if (!linkInput.trim() || !selectedText) {
      return
    }

    setConverting(true)
    try {
      const card = await fetchLinkCard(linkInput.trim())

      editor.update(() => {
        if (!selectionRef.current) {
          return
        }

        $setSelection(selectionRef.current.clone())
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          return
        }

        selection.insertNodes([
          $createLinkPreviewCardNode({
            ...card,
            title: selectedText,
            url: linkInput.trim(),
          }),
        ])
      })

      setShowLinkEditor(false)
      setShowMenu(false)
      setLinkInput('')
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
        <Button size="sm" variant="outline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} type="button">
          加粗
        </Button>
        <Button size="sm" variant="outline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} type="button">
          斜体
        </Button>
        <Button size="sm" variant="outline" onClick={applyParagraph} type="button">
          正文
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyHeading('h1')} type="button">
          标题1
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyHeading('h2')} type="button">
          标题2
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyHeading('h3')} type="button">
          标题3
        </Button>

        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              applyTextColor(event.target.value)
            }
          }}
        >
          <option value="" disabled>
            字体颜色
          </option>
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button size="sm" variant="outline" onClick={() => setShowLinkEditor(true)} type="button">
          🔗
        </Button>
      </div>

      {showLinkEditor && (
        <div
          className="fixed z-30 flex -translate-x-1/2 gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-xl"
          style={{ left: selectionPosition.left, top: selectionPosition.top + 8 }}
        >
          <input
            className="w-72 rounded border border-slate-300 px-3 py-1.5 text-sm"
            onChange={(event) => setLinkInput(event.target.value)}
            placeholder="输入链接 URL"
            value={linkInput}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowLinkEditor(false)
              setLinkInput('')
            }}
            type="button"
          >
            取消
          </Button>
          <Button size="sm" onClick={submitLink} type="button" variant="outline">
            确认
          </Button>
          <Button disabled={converting} size="sm" onClick={() => void convertToCard()} type="button">
            {converting ? '转换中...' : '转化为卡片'}
          </Button>
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
            placeholder={<p className="pointer-events-none -mt-9 px-3 text-slate-400">输入 URL（如 https://example.com）会自动转换成卡片...</p>}
            ErrorBoundary={({ children }) => <>{children}</>}
          />
          <HistoryPlugin />
          <LinkPlugin />
          <AutoLinkCardPlugin />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">当前选中文本：{content || '（暂无）'}</div>
      </section>
    </main>
  )
}
