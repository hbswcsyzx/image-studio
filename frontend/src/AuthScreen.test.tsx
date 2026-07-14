import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import AuthScreen from './AuthScreen'


test('renders only the auth action words as underlined links', async () => {
  render(<AuthScreen onAuth={vi.fn()} />)
  expect(screen.getByText('没有账户？')).toBeInTheDocument()
  const register = screen.getByRole('button', { name: '立即注册' })
  expect(register).toHaveClass('auth-switch-link')

  await userEvent.click(register)
  expect(screen.getByText('已有账户？')).toBeInTheDocument()
  const login = screen.getByRole('button', { name: '返回登录' })
  expect(login).toHaveClass('auth-switch-link')
})
