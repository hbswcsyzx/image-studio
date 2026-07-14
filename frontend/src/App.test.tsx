import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App'

let currentUser = {
  id: 'u1', username: 'alice', role: 'user' as const, must_change_password: false,
  email: null, onboarding_completed: true,
  preferences: {
    default_image_provider_id: 'p-image', default_image_model: 'gpt-image-2',
    default_text_provider_id: 'p-text', default_text_model: 'gpt-5.5',
  },
}
const workspace = { id: 'w1', user_id: 'u1', name: '产品概念', favorite: false, image_count: 0, latest_asset_id: null, created_at: '', updated_at: '', runs: [] }
const providers = [
  { id: 'p-image', name: 'Basil Image', base_url: 'https://basil.xin', has_api_key: true, models: ['gpt-image-2'], image_models: ['gpt-image-2'], text_models: [] },
  { id: 'p-text', name: 'Basil Text', base_url: 'https://basil.xin', has_api_key: true, models: ['gpt-5.5'], image_models: [], text_models: ['gpt-5.5'] },
]

beforeEach(() => {
  localStorage.clear()
  currentUser = { ...currentUser, onboarding_completed: true }
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/api/auth/me')) return new Response(JSON.stringify(currentUser), { status: 200 })
    if (url.endsWith('/api/workspaces')) return new Response(JSON.stringify([workspace]))
    if (url.endsWith('/api/workspaces/w1')) return new Response(JSON.stringify(workspace))
    if (url.endsWith('/api/providers')) return new Response(JSON.stringify(providers))
    if (url.endsWith('/api/quota')) return new Response(JSON.stringify({ used: 0, limit: 1000, conversations_used: 1, conversations_limit: 100 }))
    return new Response('{}', { status: 200 })
  }))
})

test('keeps image output as the primary workspace surface', async () => {
  render(<App />)
  expect(await screen.findByRole('heading', { name: '产品概念' })).toBeInTheDocument()
  expect(screen.getByLabelText('图片输出')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('描述你想生成的图片')).toBeInTheDocument()
  expect(screen.queryByText('会话记录')).not.toBeInTheDocument()
})

test('opens session history only when requested', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: '产品概念' })
  await userEvent.click(screen.getByRole('button', { name: '打开会话' }))
  expect(screen.getByText('创作库')).toBeInTheDocument()
})

test('offers direct generation and optional prompt optimization', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: '产品概念' })
  expect(screen.getByRole('button', { name: '生成图片' })).toBeEnabled()
  expect(screen.getByRole('button', { name: '一键润色' })).toBeInTheDocument()
  expect(screen.getByLabelText('上传参考图')).toBeInTheDocument()
  expect(screen.queryByText('上游')).not.toBeInTheDocument()
  expect(screen.queryByText('图片模型')).not.toBeInTheDocument()
})

test('organizes settings into second-level sections', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: '产品概念' })
  await userEvent.click(screen.getByRole('button', { name: '打开设置' }))
  expect(screen.getByRole('button', { name: '概览' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '添加模型' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '个人信息' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '系统设置' })).not.toBeInTheDocument()
})

test('shows a short first-run guide before model setup', async () => {
  currentUser = { ...currentUser, onboarding_completed: false }
  render(<App />)
  expect(await screen.findByRole('heading', { name: '欢迎来到 Studio Basil' })).toBeInTheDocument()
  expect(screen.getByText('历史刻度')).toBeInTheDocument()
  expect(screen.getByText('创作区')).toBeInTheDocument()
})

test('defaults theme to system and allows explicit dark mode', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: '产品概念' })
  expect(document.documentElement.dataset.theme).toBeUndefined()
  await userEvent.click(screen.getByRole('button', { name: '切换主题' }))
  await userEvent.click(screen.getByRole('menuitem', { name: '深色' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})
