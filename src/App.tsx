import { useCallback, useEffect, useMemo, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $getRoot,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type EditorState,
} from 'lexical'
import { $patchStyleText, $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, HeadingNode } from '@lexical/rich-text'

import { Button } from '@/components/ui/button'

type FormatState = {
  bold: boolean
  italic: boolean
  underline: boolean
}

type LinkCard = {
  url: string
  title: string
  description: string
  siteName: string
  image?: string
}

const initialConfig = {
  namespace: 'basic-editor',
  nodes: [HeadingNode],
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

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          const selection = $getSelection()
          setShowMenu($isRangeSelection(selection) && !selection.isCollapsed())
        })
        return false
      },
      1,
    )
  }, [editor])

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
    </div>
  )
}

const URL_REGEX = /https?:\/\/[^\s]+/g

export default function App() {
  const [content, setContent] = useState('')
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])
  const [ignoredUrls, setIgnoredUrls] = useState<string[]>([])
  const [cards, setCards] = useState<LinkCard[]>([])
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        setContent(selection.getTextContent())
      }

      const fullText = $getRoot().getTextContent()
      const urls = fullText.match(URL_REGEX) ?? []
      setDetectedUrls(Array.from(new Set(urls)))
    })
  }

  const pendingUrl = useMemo(
    () => detectedUrls.find((url) => !cards.some((card) => card.url === url) && !ignoredUrls.includes(url)) ?? null,
    [cards, detectedUrls, ignoredUrls],
  )

  const dismissCurrentUrl = () => {
    if (pendingUrl) {
      setIgnoredUrls((previous) => [...previous, pendingUrl])
    }
  }

  const convertToCard = async () => {
    if (!pendingUrl) {
      return
    }

    setLoadingUrl(pendingUrl)
    setLinkError(null)

    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(pendingUrl)}`)
      if (!response.ok) {
        throw new Error('请求失败')
      }

      const result = await response.json()
      const title = result?.data?.title || pendingUrl
      const description = result?.data?.description || '暂无描述'
      const siteName = result?.data?.publisher || new URL(pendingUrl).hostname
      const image = result?.data?.image?.url

      setCards((previous) => [{ url: pendingUrl, title, description, siteName, image }, ...previous])
    } catch {
      setLinkError('链接信息获取失败，可能是目标站点不支持抓取。')
    } finally {
      setLoadingUrl(null)
      setIgnoredUrls((previous) => [...previous, pendingUrl])
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center p-6">
      <section className="w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Lexical 基础编辑器</h1>
        <LexicalComposer initialConfig={initialConfig}>
          <ToolbarPlugin />
          <SelectionMenuPlugin />
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

        {pendingUrl && (
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <p className="mb-2">检测到链接：{pendingUrl}</p>
            <p className="mb-3">是否将该链接转换为卡片预览？</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={convertToCard} disabled={loadingUrl === pendingUrl}>
                {loadingUrl === pendingUrl ? '抓取中...' : '是，转换为卡片'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={dismissCurrentUrl}>
                否
              </Button>
            </div>
          </div>
        )}

        {linkError && <p className="mt-3 text-sm text-red-600">{linkError}</p>}

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">当前选中文本：{content || '（暂无）'}</div>

        {cards.length > 0 && (
          <div className="mt-4 space-y-3">
            {cards.map((card) => (
              <article key={card.url} className="overflow-hidden rounded-md border border-slate-200">
                {card.image && <img src={card.image} alt={card.title} className="h-40 w-full object-cover" />}
                <div className="space-y-2 p-3">
                  <p className="text-xs text-slate-500">{card.siteName}</p>
                  <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
                  <p className="text-sm text-slate-600">{card.description}</p>
                  <a className="text-sm text-blue-600 underline" href={card.url} target="_blank" rel="noreferrer">
                    {card.url}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
