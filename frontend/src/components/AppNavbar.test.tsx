import {
  act,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  useLocation,
} from 'react-router-dom'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { CurrentUser } from '../api/auth'
import {
  AuthContext,
  type AuthContextValue,
} from '../auth/auth-context'
import { AppNavbar } from './AppNavbar'

const logoutMock = vi.fn<AuthContextValue['logout']>()

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
  logout: logoutMock,
}

function CurrentPath() {
  const location = useLocation()

  return (
    <output data-testid="current-path">
      {location.pathname}{location.search}
    </output>
  )
}

function renderNavbar(
  path = '/',
  authOverrides: Partial<AuthContextValue> = {},
) {
  const authValue = {
    ...signedOutAuth,
    ...authOverrides,
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={authValue}>
        <AppNavbar />
        <CurrentPath />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('AppNavbar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    logoutMock.mockResolvedValue(undefined)
  })

  it('shows public actions to a signed-out user', () => {
    renderNavbar()

    expect(
      screen.getByRole('navigation', {
        name: 'Primary navigation',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'ThoughtHub' }),
    ).toHaveAttribute('href', '/')
    expect(
      screen.getByRole('link', { name: 'Home' }),
    ).toHaveClass('active')
    expect(
      screen.getByRole('link', { name: 'Log in' }),
    ).toHaveAttribute('href', '/login')
    expect(
      screen.getByRole('link', { name: 'Create account' }),
    ).toHaveAttribute('href', '/register')
    expect(
      screen.queryByRole('link', { name: 'Dashboard' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeInTheDocument()
  })

  it('opens live search automatically while the user types', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.type(
      screen.getByRole('searchbox', {
        name: 'Search posts, people, and topics',
      }),
      'Django',
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(
        '/search?q=Django',
      )
    })
  })

  it('shows a neutral status while authentication initializes', () => {
    renderNavbar('/', {
      isInitializing: true,
    })

    const navigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    })

    expect(within(navigation).getByRole('status')).toHaveTextContent(
      'Checking session…',
    )
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Create account' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeInTheDocument()
  })

  it('shows private navigation and the first name when authenticated', () => {
    renderNavbar('/dashboard', {
      user: currentUser,
      isAuthenticated: true,
    })

    expect(
      screen.getByRole('link', { name: 'Dashboard' }),
    ).toHaveClass('active')
    expect(
      screen.getByRole('link', { name: 'Saved posts' }),
    ).toHaveAttribute('href', '/saved')
    expect(
      screen.getByRole('link', { name: 'Notifications' }),
    ).toHaveAttribute('href', '/notifications')
    expect(screen.getByText('Arya')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Log out' }),
    ).toBeEnabled()
    expect(
      screen.queryByRole('link', { name: 'Log in' }),
    ).not.toBeInTheDocument()
  })

  it('uses the username when the user has no first name', () => {
    renderNavbar('/dashboard', {
      user: {
        ...currentUser,
        first_name: '',
      },
      isAuthenticated: true,
    })

    expect(screen.getByText('arya')).toBeInTheDocument()
  })

  it('disables logout while pending and navigates home after success', async () => {
    let resolveLogout: () => void = () => {}
    logoutMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLogout = resolve
      }),
    )
    const user = userEvent.setup()
    renderNavbar('/dashboard', {
      user: currentUser,
      isAuthenticated: true,
    })

    await user.click(
      screen.getByRole('button', { name: 'Log out' }),
    )

    expect(logoutMock).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'Logging out…' }),
    ).toBeDisabled()
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/dashboard',
    )

    await act(async () => {
      resolveLogout()
    })

    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/',
    )
  })

  it('shows an error and stays on the page when logout fails', async () => {
    logoutMock.mockRejectedValue(
      new Error('Django could not end the session.'),
    )
    const user = userEvent.setup()
    renderNavbar('/dashboard', {
      user: currentUser,
      isAuthenticated: true,
    })

    await user.click(
      screen.getByRole('button', { name: 'Log out' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Django could not end the session.',
    )
    expect(screen.getByTestId('current-path')).toHaveTextContent(
      '/dashboard',
    )
    expect(
      screen.getByRole('button', { name: 'Log out' }),
    ).toBeEnabled()
  })
})
