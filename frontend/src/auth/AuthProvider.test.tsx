import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getCurrentUser,
  initializeCsrf,
  login,
  logout,
  register,
  updateCurrentUser,
  type CurrentUser,
  type LoginCredentials,
  type RegistrationData,
} from '../api/auth'
import { ApiError } from '../api/client'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

vi.mock('../api/auth', () => ({
  getCurrentUser: vi.fn(),
  initializeCsrf: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  updateCurrentUser: vi.fn(),
}))

const getCurrentUserMock = vi.mocked(getCurrentUser)
const initializeCsrfMock = vi.mocked(initializeCsrf)
const loginMock = vi.mocked(login)
const logoutMock = vi.mocked(logout)
const registerMock = vi.mocked(register)
const updateCurrentUserMock = vi.mocked(updateCurrentUser)

const currentUser: CurrentUser = {
  id: 7,
  username: 'arya',
  email: 'arya@example.com',
  first_name: 'Arya',
  last_name: 'Tavana',
  is_staff: false,
}

const loginCredentials: LoginCredentials = {
  username: 'arya',
  password: 'StrongPassword123!',
}

const registrationData: RegistrationData = {
  username: 'new-user',
  email: 'new-user@example.com',
  password: 'StrongPassword123!',
  password_confirm: 'StrongPassword123!',
}

const profileUpdate = {
  email: 'updated@example.com',
  first_name: 'Updated',
  last_name: 'Author',
}

function AuthStateProbe() {
  const auth = useAuth()

  return (
    <div>
      <p>{auth.isInitializing ? 'Initializing' : 'Ready'}</p>
      <p>{auth.isAuthenticated ? 'Authenticated' : 'Signed out'}</p>
      <p>{auth.user?.username ?? 'No current user'}</p>
      <p>{auth.user?.email ?? 'No current email'}</p>
      <p>{auth.initializationError ?? 'No initialization error'}</p>

      <button
        type="button"
        onClick={() => {
          void auth.login(loginCredentials)
        }}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.register(registrationData)
        }}
      >
        Register
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.logout()
        }}
      >
        Log out
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.updateProfile(profileUpdate)
        }}
      >
        Update profile
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthStateProbe />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    initializeCsrfMock.mockResolvedValue({
      detail: 'CSRF cookie set.',
    })
    getCurrentUserMock.mockRejectedValue(
      new ApiError(
        'Authentication credentials were not provided.',
        403,
        {
          detail: 'Authentication credentials were not provided.',
        },
      ),
    )
    logoutMock.mockResolvedValue({ detail: 'Logged out.' })
  })

  it('restores an existing authenticated session', async () => {
    getCurrentUserMock.mockResolvedValue(currentUser)

    renderProvider()

    expect(screen.getByText('Initializing')).toBeInTheDocument()
    expect(
      await screen.findByText(currentUser.username),
    ).toBeInTheDocument()
    expect(screen.getByText('Authenticated')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(initializeCsrfMock).toHaveBeenCalledOnce()
    expect(getCurrentUserMock).toHaveBeenCalledOnce()
    expect(
      initializeCsrfMock.mock.invocationCallOrder[0],
    ).toBeLessThan(
      getCurrentUserMock.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('treats an unauthenticated response as a normal signed-out state', async () => {
    renderProvider()

    expect(await screen.findByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('Signed out')).toBeInTheDocument()
    expect(screen.getByText('No current user')).toBeInTheDocument()
    expect(
      screen.getByText('No initialization error'),
    ).toBeInTheDocument()
  })

  it('exposes unexpected initialization errors', async () => {
    initializeCsrfMock.mockRejectedValue(
      new Error('Django is unavailable.'),
    )

    renderProvider()

    expect(
      await screen.findByText('Django is unavailable.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(getCurrentUserMock).not.toHaveBeenCalled()
  })

  it('stores the user returned by login', async () => {
    loginMock.mockResolvedValue(currentUser)
    const user = userEvent.setup()
    renderProvider()
    await screen.findByText('Ready')

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      await screen.findByText(currentUser.username),
    ).toBeInTheDocument()
    expect(screen.getByText('Authenticated')).toBeInTheDocument()
    expect(loginMock).toHaveBeenCalledWith(loginCredentials)
  })

  it('stores the user returned by registration', async () => {
    const registeredUser = {
      ...currentUser,
      id: 8,
      username: registrationData.username,
      email: registrationData.email,
    }
    registerMock.mockResolvedValue(registeredUser)
    const user = userEvent.setup()
    renderProvider()
    await screen.findByText('Ready')

    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(
      await screen.findByText(registeredUser.username),
    ).toBeInTheDocument()
    expect(registerMock).toHaveBeenCalledWith(registrationData)
  })

  it('clears the current user after logout succeeds', async () => {
    getCurrentUserMock.mockResolvedValue(currentUser)
    const user = userEvent.setup()
    renderProvider()
    await screen.findByText(currentUser.username)

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => {
      expect(screen.getByText('Signed out')).toBeInTheDocument()
    })
    expect(screen.getByText('No current user')).toBeInTheDocument()
    expect(logoutMock).toHaveBeenCalledOnce()
  })

  it('stores profile updates returned by the API', async () => {
    getCurrentUserMock.mockResolvedValue(currentUser)
    const updatedUser = {...currentUser, ...profileUpdate}
    updateCurrentUserMock.mockResolvedValue(updatedUser)
    const user = userEvent.setup()
    renderProvider()
    await screen.findByText(currentUser.username)

    await user.click(
      screen.getByRole('button', {name: 'Update profile'}),
    )

    expect(
      await screen.findByText(updatedUser.email),
    ).toBeInTheDocument()
    expect(updateCurrentUserMock).toHaveBeenCalledWith(profileUpdate)
  })
})

describe('useAuth', () => {
  it('throws a helpful error outside AuthProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<AuthStateProbe />)).toThrow(
      'useAuth must be used inside an AuthProvider.',
    )
  })
})
