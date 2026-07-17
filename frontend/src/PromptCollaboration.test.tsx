import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import PromptCollaboration from './PromptCollaboration'

const defaultProps = {
  active: true,
  workspaceId: 'w1',
  providerId: 'pt',
  model: 'gpt-5.5',
  stylePrompt: '电影感',
  settings: { size: '3840x2160', quality: 'high' },
  referenceAssetIds: ['a1'],
  libraryReferenceIds: ['l1'],
  onSuggestion: vi.fn(),
  onError: vi.fn(),
}

test('keeps collaboration inline and synchronizes the latest assistant prompt automatically', async () => {
  const onSuggestion = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!init?.method) return Response.json([])
    return Response.json({ messages: [
      { id: 'm-user', role: 'user', content: '组合两张参考图' },
      { id: 'm-assistant', role: 'assistant', content: '完整的图片生成提示词' },
    ] })
  }))

  render(<PromptCollaboration {...defaultProps} onSuggestion={onSuggestion} />)

  expect(screen.getByRole('region', { name: '提示词协作' })).toBeInTheDocument()
  await userEvent.type(screen.getByRole('textbox', { name: '继续与提示词助手沟通' }), '更强调人物动作')
  await userEvent.click(screen.getByRole('button', { name: '发送' }))

  await waitFor(() => expect(onSuggestion).toHaveBeenCalledWith('完整的图片生成提示词'))
  expect(screen.queryByRole('button', { name: /采用/ })).not.toBeInTheDocument()
})

test('permanently clears collaboration memory after confirmation', async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'DELETE') return new Response(null, { status: 204 })
    return Response.json([{ id: 'old', role: 'assistant', content: '旧的协作记忆' }])
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<PromptCollaboration {...defaultProps} />)

  expect(await screen.findByText('旧的协作记忆')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '新建提示词对话' }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    '/api/workspaces/w1/prompt-collaboration',
    expect.objectContaining({ method: 'DELETE' }),
  ))
  expect(screen.queryByText('旧的协作记忆')).not.toBeInTheDocument()
  expect(screen.getByText(/描述参考图如何组合/)).toBeInTheDocument()
})

test('grows the composer with its content and scrolls to the latest reply', async () => {
  let resolveReply!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (!init?.method) return Response.json([])
    return new Promise<Response>(resolve => { resolveReply = resolve })
  }))
  render(<PromptCollaboration {...defaultProps} />)
  const history = screen.getByRole('log', { name: '提示词协作记录' })
  Object.defineProperty(history, 'scrollHeight', { configurable: true, value: 420 })
  const textbox = screen.getByRole('textbox', { name: '继续与提示词助手沟通' })
  Object.defineProperty(textbox, 'scrollHeight', { configurable: true, value: 132 })

  await userEvent.type(textbox, '继续细化面部表情')
  expect(textbox).toHaveStyle({ height: '132px' })
  await userEvent.click(screen.getByRole('button', { name: '发送' }))
  resolveReply(Response.json({ messages: [
    { id: 'm-user', role: 'user', content: '继续细化面部表情' },
    { id: 'm-assistant', role: 'assistant', content: '新的完整提示词' },
  ] }))

  expect(await screen.findByText('新的完整提示词')).toBeInTheDocument()
  await waitFor(() => expect(history.scrollTop).toBe(420))
})
