import { useEffect, useState } from 'react'
import { LoaderCircle, Send } from 'lucide-react'
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

  useEffect(() => {
    if (!props.active || !props.workspaceId) return
    api<Message[]>(`/api/workspaces/${props.workspaceId}/prompt-collaboration`)
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [props.active, props.workspaceId])

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
    } catch (err) {
      props.onError(err instanceof Error ? err.message : '提示词协作失败')
    } finally {
      setBusy(false)
    }
  }

  return <section className="collaboration-panel" role="region" aria-label="提示词协作">
    <div className="collaboration-history">
      {messages.length ? messages.map(item => <article key={item.id} className={`collaboration-message ${item.role}`}>
        <small>{item.role === 'user' ? '你的需求' : '助手建议'}</small>
        <p>{item.content}</p>
      </article>) : <p className="collaboration-empty">描述参考图如何组合、哪些内容需要保留，以及最终希望呈现的效果。助手会结合当前风格和图片设置持续完善提示词。</p>}
    </div>
    <div className="collaboration-composer">
      <textarea aria-label="继续与提示词助手沟通" value={message} onChange={event => setMessage(event.target.value)} placeholder="继续说明需要保留、组合或调整的内容" rows={3} />
      <button className="primary-button" aria-label="发送" onClick={send} disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}<span>{busy ? '正在思考' : '发送'}</span></button>
    </div>
  </section>
}
