import { useCallback, useEffect, useMemo, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type EditorState,
  type LexicalNode,
} from 'lexical'
import { $patchStyleText, $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, HeadingNode } from '@lexical/rich-text'

import { LinkPreviewCardNode, $createLinkPreviewCardNode } from '@/nodes/LinkPreviewCardNode'
import { AutoLinkCardPlugin, fetchLinkCard } from '@/plugins/AutoLinkCardPlugin'
import { Button } from '@/components/ui/button'

type FormatState = {
  bold: boolean
  italic: boolean
  underline: boolean
}

const initialConfig = {
  namespace: 'basic-editor',
  nodes: [HeadingNode, LinkPreviewCardNode],
  theme: {
    paragraph: 'mb-2',
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

const BACKGROUND_OPTIONS = [
  { label: '无背景', value: 'transparent' },
  { label: '浅黄', value: '#fef08a' },
  { label: '浅蓝', value: '#bfdbfe' },
  { label: '浅绿', value: '#bbf7d0' },
]

const URL_REGEX = /^https?:\/\/[^\s]+$/

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
  })

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) {
      setFormatState({ bold: false, italic: false, underline: false })
      return
    }

    setFormatState({
      bold: selection.hasFormat('bold'),
      italic: selection.hasFormat('italic'),
      underline: selection.hasFormat('underline'),
    })
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar)
        return false
      },
      1,
    )
  }, [editor, updateToolbar])

  return (
    <div className="mb-3 flex gap-2 border-b border-slate-200 pb-3">
      <Button
        size="sm"
        variant={formatState.bold ? 'default' : 'outline'}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        type="button"
      >
        Bold
      </Button>
      <Button
        size="sm"
        variant={formatState.italic ? 'default' : 'outline'}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        type="button"
      >
        Italic
      </Button>
      <Button
        size="sm"
        variant={formatState.underline ? 'default' : 'outline'}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        type="button"
      >
        Underline
      </Button>
    </div>
  )
}

function SelectionMenuPlugin() {
  const [editor] = useLexicalComposerContext()
  const [showMenu, setShowMenu] = useState(false)
  const [isSelectedLink, setIsSelectedLink] = useState(false)

  const updateSelectionState = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      setShowMenu(false)
      setIsSelectedLink(false)
      return
    }

    const content = selection.getTextContent().trim()
    setShowMenu(true)
    setIsSelectedLink(URL_REGEX.test(content))
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

  const applyBackgroundColor = (backgroundColor: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'background-color': backgroundColor })
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

  const convertSelectedLinkToCard = async () => {
    const selectionText = editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        return null
      }

      const text = selection.getTextContent().trim()
      if (!URL_REGEX.test(text)) {
        return null
      }

      return text
    })

    if (!selectionText) {
      return
    }

    const card = await fetchLinkCard(selectionText)

    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        return
      }

      const selectedNodes = selection.getNodes()
      if (selectedNodes.length !== 1 || !$isTextNode(selectedNodes[0])) {
        return
      }

      const selectedNode = selectedNodes[0]
      const selectedText = selection.getTextContent().trim()
      if (!URL_REGEX.test(selectedText)) {
        return
      }

      const textContent = selectedNode.getTextContent()
      const startOffset = Math.min(selection.anchor.offset, selection.focus.offset)
      const endOffset = Math.max(selection.anchor.offset, selection.focus.offset)

      const before = textContent.slice(0, startOffset)
      const after = textContent.slice(endOffset)

      const insertNodes: LexicalNode[] = []
      if (before) {
        insertNodes.push($createTextNode(before))
      }
      insertNodes.push($createLinkPreviewCardNode(card))
      if (after) {
        insertNodes.push($createTextNode(after))
      }

      selectedNode.replace(insertNodes[0])
      let currentNode = insertNodes[0]
      for (let i = 1; i < insertNodes.length; i += 1) {
        currentNode.insertAfter(insertNodes[i])
        currentNode = insertNodes[i]
      }
      $setSelection(null)
    })
  }

  if (!showMenu) {
    return null
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
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

      <select
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        defaultValue=""
        onChange={(event) => {
          if (event.target.value) {
            applyBackgroundColor(event.target.value)
          }
        }}
      >
        <option value="" disabled>
          背景色
        </option>
        {BACKGROUND_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <Button size="sm" variant="outline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} type="button">
        加粗
      </Button>
      <Button size="sm" variant="outline" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} type="button">
        斜体
      </Button>
      <Button size="sm" variant="outline" onClick={() => applyHeading('h1')} type="button">
        H1
      </Button>
      <Button size="sm" variant="outline" onClick={() => applyHeading('h2')} type="button">
        H2
      </Button>
      <Button size="sm" variant="outline" onClick={() => applyHeading('h3')} type="button">
        H3
      </Button>
      <Button size="sm" variant="outline" onClick={applyParagraph} type="button">
        正文
      </Button>
      {isSelectedLink && (
        <Button size="sm" variant="default" onClick={() => void convertSelectedLinkToCard()} type="button">
          链接卡片开关
        </Button>
      )}
    </div>
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
          <ToolbarPlugin />
          <SelectionMenuPlugin />
          <RichTextPlugin
            contentEditable={<ContentEditable className={editorContentClasses} />}
            placeholder={<p className="pointer-events-none -mt-9 px-3 text-slate-400">输入 URL（如 https://example.com）会自动转换成卡片...</p>}
            ErrorBoundary={({ children }) => <>{children}</>}
          />
          <HistoryPlugin />
          <AutoLinkCardPlugin />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">当前选中文本：{content || '（暂无）'}</div>
      </section>
    </main>
  )
}
