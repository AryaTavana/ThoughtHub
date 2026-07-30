import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import App from './App'
import {
  AuthContext,
  type AuthContextValue,
} from './auth/auth-context'

const signedOutAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isInitializing: false,
  initializationError: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={signedOutAuth}>
        <App />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('application routes', () => {
  it('renders the home page with main navigation', () => {
    renderRoute('/')

    expect(
      screen.getByRole('heading', { name: 'ThoughtHub' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Log in' }),
    ).toHaveAttribute('href', '/login')
    expect(
      screen.getByRole('link', { name: 'Create account' }),
    ).toHaveAttribute('href', '/register')
    expect(
      screen.getByRole('link', { name: 'Dashboard' }),
    ).toHaveAttribute('href', '/dashboard')
  })

  it.each([
    ['/login', 'Log in'],
    ['/register', 'Create account'],
    ['/dashboard', 'Dashboard'],
  ])('renders %s at its matching route', (path, heading) => {
    renderRoute(path)

    expect(
      screen.getByRole('heading', { name: heading }),
    ).toBeInTheDocument()
  })

  it('renders a fallback page for an unknown route', () => {
    renderRoute('/missing-page')

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Return home' }),
    ).toHaveAttribute('href', '/')
  })
})
