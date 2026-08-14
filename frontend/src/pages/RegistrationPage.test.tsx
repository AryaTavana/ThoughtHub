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
import { RegistrationPage } from './RegistrationPage'

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
    updateProfile: vi.fn(),
    logout: logoutMock,
    ...overrides,
  })
}

function renderRegistration() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route
          path="/register"
          element={<RegistrationPage />}
        />
        <Route
          path="/dashboard"
          element={<h1>Dashboard destination</h1>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillRegistrationForm(
  password = 'StrongPassword123!',
  passwordConfirm = password,
) {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText('Username'), 'arya')
  await user.type(
    screen.getByLabelText('Email'),
    'arya@example.com',
  )
  await user.type(screen.getByLabelText('First name'), 'Arya')
  await user.type(screen.getByLabelText('Last name'), 'Tavana')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(
    screen.getByLabelText('Confirm password'),
    passwordConfirm,
  )

  return user
}

describe('RegistrationPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    registerMock.mockResolvedValue(currentUser)
    setAuthState()
  })

  it('renders accessible registration controls and login link', () => {
    renderRegistration()

    expect(
      screen.getByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'autocomplete',
      'username',
    )
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'type',
      'email',
    )
    expect(screen.getByLabelText('First name')).not.toBeRequired()
    expect(screen.getByLabelText('Last name')).not.toBeRequired()
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAttribute('type', 'password')
    expect(
      screen.getByRole('link', { name: 'Sign in' }),
    ).toHaveAttribute('href', '/login')
  })

  it('submits all fields and navigates to the dashboard', async () => {
    renderRegistration()
    const user = await fillRegistrationForm()

    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(registerMock).toHaveBeenCalledWith({
      username: 'arya',
      email: 'arya@example.com',
      first_name: 'Arya',
      last_name: 'Tavana',
      password: 'StrongPassword123!',
      password_confirm: 'StrongPassword123!',
    })
    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })

  it('rejects mismatched passwords before calling the API', async () => {
    renderRegistration()
    const user = await fillRegistrationForm(
      'StrongPassword123!',
      'DifferentPassword123!',
    )

    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(registerMock).not.toHaveBeenCalled()
    expect(
      screen.getByText('Passwords do not match.'),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Confirm password'),
    ).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows Django field errors and clears an edited field error', async () => {
    registerMock.mockRejectedValue(
      new ApiError(
        'Request failed with status 400.',
        400,
        {
          username: ['This username is already taken.'],
          email: [
            'Enter a valid email address.',
            'This email is already registered.',
          ],
          password: ['This password is too common.'],
        },
      ),
    )
    renderRegistration()
    const user = await fillRegistrationForm()

    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      await screen.findByText('This username is already taken.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Enter a valid email address. This email is already registered.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('This password is too common.'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Username'), '2')

    expect(
      screen.queryByText('This username is already taken.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute(
      'aria-invalid',
      'false',
    )
  })

  it('shows a general registration failure', async () => {
    registerMock.mockRejectedValue(
      new Error('The server is unavailable.'),
    )
    renderRegistration()
    const user = await fillRegistrationForm()

    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server is unavailable.',
    )
  })

  it('disables the form while registration is pending', async () => {
    let resolveRegistration: (user: CurrentUser) => void = () => {}
    registerMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRegistration = resolve
      }),
    )
    renderRegistration()
    const user = await fillRegistrationForm()

    await user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      screen.getByRole('button', { name: 'Creating account...' }),
    ).toBeDisabled()
    expect(screen.getByLabelText('Username')).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(
      screen.getByLabelText('Confirm password'),
    ).toBeDisabled()

    await act(async () => {
      resolveRegistration(currentUser)
    })
  })

  it('shows session initialization state and errors', () => {
    setAuthState({
      isInitializing: true,
    })
    const { rerender } = renderRegistration()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your account...',
    )

    setAuthState({
      initializationError: 'Django is unavailable.',
    })
    rerender(
      <MemoryRouter initialEntries={['/register']}>
        <RegistrationPage />
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
    renderRegistration()

    expect(
      await screen.findByRole('heading', {
        name: 'Dashboard destination',
      }),
    ).toBeInTheDocument()
  })
})
