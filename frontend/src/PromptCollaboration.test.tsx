import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import PromptCollaboration from './PromptCollaboration'

test('keeps collaboration inline and synchronizes the latest assistant prompt automatically', async () => {
  const onSuggestion = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!init?.method) return Response.json([])
    return Response.json({ messages: [
      { id: 'm-user', role: 'user', content: '组合两张参考图' },
      { id: 'm-assistant', role: 'assistant', content: '完整的图片生成提示词' },
    ] })
  }))

  render(<PromptCollaboration
    active
    workspaceId="w1"
    providerId="pt"
    model="gpt-5.5"
    stylePrompt="电影感"
    settings={{ size: '3840x2160', quality: 'high' }}
    referenceAssetIds={['a1']}
    libraryReferenceIds={['l1']}
    onSuggestion={onSuggestion}
    onError={vi.fn()}
  />)

  expect(screen.getByRole('region', { name: '提示词协作' })).toBeInTheDocument()
  await userEvent.type(screen.getByRole('textbox', { name: '继续与提示词助手沟通' }), '更强调人物动作')
  await userEvent.click(screen.getByRole('button', { name: '发送' }))

  await waitFor(() => expect(onSuggestion).toHaveBeenCalledWith('完整的图片生成提示词'))
  expect(screen.queryByRole('button', { name: /采用/ })).not.toBeInTheDocument()
})

