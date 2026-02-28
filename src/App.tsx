import { useCallback, useEffect, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type EditorState,
} from 'lexical'

import { Button } from '@/components/ui/button'

type FormatState = {
  bold: boolean
  italic: boolean
  underline: boolean
}

const initialConfig = {
  namespace: 'basic-editor',
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

export default function App() {
  const [content, setContent] = useState('')

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
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-52 rounded-md border border-slate-200 bg-white p-3 text-slate-900 outline-none" />
            }
            placeholder={<p className="pointer-events-none -mt-9 px-3 text-slate-400">请输入内容...</p>}
            ErrorBoundary={({ children }) => <>{children}</>}
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          当前选中文本：{content || '（暂无）'}
        </div>
      </section>
    </main>
  )
}
