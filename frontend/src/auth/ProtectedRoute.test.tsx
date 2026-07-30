import { render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { CurrentUser } from '../api/auth'
import {
  AuthContext,
  type AuthContextValue,
} from './auth-context'
import { ProtectedRoute } from './ProtectedRoute'

const currentUser: CurrentUser = {
  id: 7,
  username: 'arya',
  email: 'arya@example.com',
  first_name: 'Arya',
  last_name: 'Tavana',
  is_staff: false,
}

const signedOutAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isInitializing: false,
  initializationError: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}

function LoginDestination() {
  const location = useLocation()
  const state = location.state as { from?: string } | null

  return (
    <>
      <h1>Login destination</h1>
      <output aria-label="Requested path">
        {state?.from ?? ''}
      </output>
    </>
  )
}

function renderProtectedRoute(
  path: string,
  authOverrides: Partial<AuthContextValue> = {},
) {
  const authValue = {
    ...signedOutAuth,
    ...authOverrides,
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={authValue}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard/posts"
              element={<h1>Protected posts</h1>}
            />
          </Route>
          <Route path="/login" element={<LoginDestination />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('waits for session initialization before choosing a route', () => {
    renderProtectedRoute('/dashboard/posts', {
      isInitializing: true,
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session…',
    )
    expect(
      screen.queryByRole('heading', { name: 'Protected posts' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Login destination',
      }),
    ).not.toBeInTheDocument()
  })

  it('redirects a signed-out user and preserves the complete URL', () => {
    renderProtectedRoute(
      '/dashboard/posts?status=draft#editor',
    )

    expect(
      screen.getByRole('heading', {
        name: 'Login destination',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Requested path' }),
    ).toHaveTextContent(
      '/dashboard/posts?status=draft#editor',
    )
  })

  it('renders the protected child route for an authenticated user', () => {
    renderProtectedRoute('/dashboard/posts', {
      user: currentUser,
      isAuthenticated: true,
    })

    expect(
      screen.getByRole('heading', { name: 'Protected posts' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Login destination',
      }),
    ).not.toBeInTheDocument()
  })
})
