import {
  act,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { CurrentUser } from '../api/auth'
import { ApiError } from '../api/client'
import type { AuthContextValue } from '../auth/auth-context'
import { useAuth } from '../auth/useAuth'
import { LoginPage } from './LoginPage'

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const useAuthMock = vi.mocked(useAuth)
const loginMock = vi.fn<AuthContextValue['login']>()
const registerMock = vi.fn<AuthContextValue['register']>()
const logoutMock = vi.fn<AuthContextValue['logout']>()

const currentUser: CurrentUser = {
  id: 7,
  username: 'arya',
  email: 'arya@example.com',
  first_name: 'Arya',
  last_name: 'Tavana',
  is_staff: false,
}

function setAuthState(
  overrides: Partial<AuthContextValue> = {},
) {
  useAuthMock.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isInitializing: false,
    initializationError: null,
    login: loginMock,
    register: registerMock,
    logout: logoutMock,
    ...overrides,
  })
}

function renderLogin(from?: string) {
  const initialEntry = from
    ? {
        pathname: '/login',
        state: { from },
      }
    : '/login'

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={<h1>Dashboard destination</h1>}
        />
        <Route
          path="/dashboard/posts/:postId"
          element={<h1>Requested protected page</h1>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    loginMock.mockResolvedValue(currentUser)
    setAuthState()
  })

  it('renders accessible login controls and registration link', () => {
    renderLogin()

    expect(
      screen.getByRole('heading', { name: 'Log in' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Username'),
    ).toHaveAttribute('autocomplete', 'username')
    expect(
      screen.getByLabelText('Password'),
    ).toHaveAttribute('type', 'password')
    expect(
      screen.getByRole('link', { name: 'Create one' }),
    ).toHaveAttribute('href', '/register')
  })

  it('submits credentials and navigates to the dashboard', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'arya')
    await user.type(
      screen.getByLabelText('Password'),
      'StrongPassword123!',
    )
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(loginMock).toHaveBeenCalledWith({
      username: 'arya',
      password: 'StrongPassword123!',
    })
    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })

  it('returns to the originally requested protected page', async () => {
    const user = userEvent.setup()
    renderLogin('/dashboard/posts/42')

    await user.type(screen.getByLabelText('Username'), 'arya')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Requested protected page',
      }),
    ).toBeInTheDocument()
  })

  it('shows Django credential errors', async () => {
    loginMock.mockRejectedValue(
      new ApiError(
        'Request failed with status 400.',
        400,
        {
          credentials: ['Invalid username or password.'],
        },
      ),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'arya')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    )
  })

  it('disables the form while login is pending', async () => {
    let resolveLogin: (user: CurrentUser) => void = () => {}
    loginMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Username'), 'arya')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      screen.getByRole('button', { name: 'Logging in…' }),
    ).toBeDisabled()
    expect(screen.getByLabelText('Username')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()

    await act(async () => {
      resolveLogin(currentUser)
    })
  })

  it('shows session initialization state and errors', () => {
    setAuthState({
      isInitializing: true,
    })
    const { rerender } = renderLogin()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session…',
    )

    setAuthState({
      initializationError: 'Django is unavailable.',
    })
    rerender(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Django is unavailable.',
    )
  })

  it('redirects an authenticated user to the dashboard', async () => {
    setAuthState({
      user: currentUser,
      isAuthenticated: true,
    })
    renderLogin()

    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })
})
