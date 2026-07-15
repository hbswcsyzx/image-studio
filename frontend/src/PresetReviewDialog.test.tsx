import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import PresetReviewDialog from './PresetReviewDialog'
import type { DerivedPresetResult, User } from './types'

const user: User = {
  id: 'u1', username: 'alice', role: 'user', must_change_password: false,
  email: null, onboarding_completed: true, preferences: { style_presets: [], image_presets: [] },
}

export const result: DerivedPresetResult = {
  summary: '用户持续保留冷色、克制光影和人物压迫感，并要求面部表达更严厉。',
  style_draft: {
    name: '冷峻电影人物', prompt: '使用克制冷色、真实材质和明确主光，突出人物轮廓、表情与压迫感，背景服务于主体。', confidence: 0.87,
    accepted: ['冷色调', '真实材质'], changes: ['面部表情更严厉'], uncertain: ['雪山是否为长期偏好'],
  },
  image_draft: {
    name: '横向高质量', size: '2048x1152', quality: 'high', count: 1, background: 'auto', output_format: 'png', output_compression: 100, confidence: 0.74,
    accepted: ['横向画布'], changes: [], uncertain: ['生成数量样本不足'],
  },
  statistics: { successful_runs: 3, generated_images: 5, favorite_images: 1, refinement_steps: 2, failed_runs_excluded: 1, representative_images: 4 },
  used_visual_analysis: true,
  fallback_reason: null,
}

test('reviews current-conversation evidence and selectively saves editable drafts', async () => {
  let body: Record<string, unknown> | undefined
  vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    body = JSON.parse(String(init?.body))
    return Response.json({ ...user, preferences: { ...user.preferences, ...body } })
  }))
  const onUser = vi.fn()
  render(<PresetReviewDialog open result={result} user={user} onClose={vi.fn()} onUser={onUser} />)

  expect(screen.getByText('仅分析当前会话')).toBeInTheDocument()
  expect(screen.getByText('3 次成功生成')).toBeInTheDocument()
  expect(screen.getByText('4 张代表图')).toBeInTheDocument()
  expect(screen.getByText('面部表情更严厉')).toBeInTheDocument()

  const prompt = screen.getByRole('textbox', { name: '风格约束提示词' })
  await userEvent.clear(prompt)
  await userEvent.type(prompt, '稳定保留冷色调、真实材质、克制光影和严厉的人物表情，背景始终服从主体。')
  await userEvent.click(screen.getByRole('checkbox', { name: '保存图片设置预设' }))
  await userEvent.click(screen.getByRole('button', { name: '保存所选预设' }))

  await waitFor(() => expect(body).toBeDefined())
  expect(body?.style_presets).toEqual([expect.objectContaining({ prompt: expect.stringContaining('稳定保留冷色调') })])
  expect(body).not.toHaveProperty('image_presets')
  expect(onUser).toHaveBeenCalled()
})

test('discloses prompt-only fallback and low confidence', () => {
  render(<PresetReviewDialog open result={{
    ...result,
    used_visual_analysis: false,
    fallback_reason: '上游文本模型不支持图片输入，已改用提示词和参数归纳。',
    image_draft: { ...result.image_draft, confidence: 0.42 },
  }} user={user} onClose={vi.fn()} onUser={vi.fn()} />)

  expect(screen.getByText(/已改用提示词和参数归纳/)).toBeInTheDocument()
  expect(screen.getByText('证据较少，请重点检查')).toBeInTheDocument()
})
