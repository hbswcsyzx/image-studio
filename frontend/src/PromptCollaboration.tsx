import { useEffect, useState } from 'react'
import { Check, Send, X } from 'lucide-react'
import { api } from './api'

type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at?: string }

type Props = {
  open: boolean
  workspaceId: string
  providerId: string
  model: string
  stylePrompt: string
  settings: Record<string, string>
  referenceAssetIds: string[]
  libraryReferenceIds: string[]
  onClose: () => void
  onApply: (prompt: string) => void
}

export default function PromptCollaboration(props: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!props.open || !props.workspaceId) return
    api<Message[]>(`/api/workspaces/${props.workspaceId}/prompt-collaboration`)
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [props.open, props.workspaceId])

  if (!props.open) return null

  async function send() {
    if (!message.trim() || busy) return
    setBusy(true); setError('')
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
      setMessages(current => [...current, ...result.messages]); setMessage('')
    } catch (err) { setError(err instanceof Error ? err.message : '提示词协作失败') }
    finally { setBusy(false) }
  }

  const candidate = [...messages].reverse().find(item => item.role === 'assistant')
  return <div className="collaboration-backdrop" role="dialog" aria-modal="true" aria-label="提示词协作">
    <section className="collaboration-panel">
      <header><div><strong>提示词协作</strong><span>基于当前参考图与会话记忆</span></div><button className="icon-button" onClick={props.onClose} aria-label="关闭提示词协作"><X /></button></header>
      <div className="collaboration-history">{messages.length ? messages.map(item => <article key={item.id} className={`collaboration-message ${item.role}`}><small>{item.role === 'user' ? '你的需求' : '候选提示词'}</small><p>{item.content}</p>{item.role === 'assistant' && <button className="secondary-button" onClick={() => props.onApply(item.content)}><Check />采用此提示词</button>}</article>) : <p className="collaboration-empty">描述你希望参考图如何组合、保留或改变。协作助手会先澄清关键歧义，再给出可直接生图的提示词。</p>}</div>
      <div className="collaboration-composer"><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="补充或修改你的创作需求" rows={3} /><button className="primary-button" onClick={send} disabled={busy || !message.trim()}>{busy ? '正在思考' : <><Send />发送</>}</button></div>
      {candidate && <button className="apply-latest" onClick={() => props.onApply(candidate.content)}><Check />采用最新候选提示词</button>}
      {error && <p className="dock-error" role="alert">{error}</p>}
    </section>
  </div>
}
