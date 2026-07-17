import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LoaderCircle, MessageSquarePlus, Send } from 'lucide-react'
import { api } from './api'

type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at?: string }

type Props = {
  active: boolean
  workspaceId: string
  providerId: string
  model: string
  stylePrompt: string
  settings: Record<string, string>
  referenceAssetIds: string[]
  libraryReferenceIds: string[]
  onSuggestion: (prompt: string) => void
  onError: (message: string) => void
}

export default function PromptCollaboration(props: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetting, setResetting] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!props.active || !props.workspaceId) return
    api<Message[]>(`/api/workspaces/${props.workspaceId}/prompt-collaboration`)
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [props.active, props.workspaceId])

  useLayoutEffect(() => {
    if (!props.active || !historyRef.current) return
    historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [props.active, messages, busy])

  if (!props.active) return null

  async function send() {
    if (!message.trim() || busy) return
    setBusy(true)
    try {
      const result = await api<{ messages: Message[] }>(`/api/workspaces/${props.workspaceId}/prompt-collaboration`, {
        method: 'POST',
        body: JSON.stringify({
          provider_id: props.providerId,
          model: props.model,
          message: message.trim(),
          style_prompt: props.stylePrompt,
          settings: props.settings,
          reference_asset_ids: props.referenceAssetIds,
          library_reference_ids: props.libraryReferenceIds,
        }),
      })
      setMessages(current => [...current, ...result.messages])
      const suggestion = [...result.messages].reverse().find(item => item.role === 'assistant')
      if (suggestion) props.onSuggestion(suggestion.content)
      setMessage('')
      if (composerRef.current) composerRef.current.style.height = ''
    } catch (err) {
      props.onError(err instanceof Error ? err.message : '提示词协作失败')
    } finally {
      setBusy(false)
    }
  }

  async function resetConversation() {
    if (busy || resetting || !messages.length) return
    if (!window.confirm('这会永久删除当前提示词协作的全部对话和记忆，且无法恢复。是否继续？')) return
    setResetting(true)
    try {
      await api<void>(`/api/workspaces/${props.workspaceId}/prompt-collaboration`, { method: 'DELETE' })
      setMessages([])
      setMessage('')
      if (composerRef.current) composerRef.current.style.height = ''
    } catch (err) {
      props.onError(err instanceof Error ? err.message : '重置提示词对话失败')
    } finally {
      setResetting(false)
    }
  }

  function resizeComposer(target: HTMLTextAreaElement) {
    target.style.height = 'auto'
    target.style.height = `${Math.min(Math.max(target.scrollHeight, 66), 220)}px`
  }

  return <section className="collaboration-panel" role="region" aria-label="提示词协作">
    <div className="collaboration-toolbar">
      <span>{messages.length ? `${messages.length} 条消息` : '新的提示词对话'}</span>
      <button className="text-button collaboration-reset" aria-label="新建提示词对话" title="永久清空当前协作记忆" onClick={resetConversation} disabled={busy || resetting || !messages.length}>
        {resetting ? <LoaderCircle className="spin" /> : <MessageSquarePlus />}
        <span>{resetting ? '正在清空' : '新对话'}</span>
      </button>
    </div>
    <div ref={historyRef} className="collaboration-history" role="log" aria-label="提示词协作记录" aria-live="polite">
      {messages.length ? messages.map(item => <article key={item.id} className={`collaboration-message ${item.role}`}>
        <small>{item.role === 'user' ? '你的需求' : '助手建议'}</small>
        <p>{item.content}</p>
      </article>) : <p className="collaboration-empty">描述参考图如何组合、哪些内容需要保留，以及最终希望呈现的效果。助手会结合当前风格和图片设置持续完善提示词。</p>}
    </div>
    <div className="collaboration-composer">
      <textarea ref={composerRef} aria-label="继续与提示词助手沟通" value={message} onChange={event => { setMessage(event.target.value); resizeComposer(event.target) }} placeholder="继续说明需要保留、组合或调整的内容" rows={2} />
      <button className="primary-button" aria-label="发送" onClick={send} disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}<span>{busy ? '正在思考' : '发送'}</span></button>
    </div>
  </section>
}
