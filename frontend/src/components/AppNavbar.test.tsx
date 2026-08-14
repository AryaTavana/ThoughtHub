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
  updateProfile: vi.fn(),
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
      screen.getByRole('link', { name: 'ThoughtHub' })
        .querySelectorAll('.thought-hub-icon__image'),
    ).toHaveLength(2)
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
      screen.getByRole('link', { name: 'Categories' }),
    ).toHaveAttribute('href', '/categories')
    expect(
      screen.queryByRole('link', { name: 'Dashboard' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeInTheDocument()
  })

  it('waits for submission before leaving the current page', async () => {
    const user = userEvent.setup()
    renderNavbar()

    const searchbox = screen.getByRole('searchbox', {
      name: 'Search published posts by title, author, category, or tag',
    })
    await user.type(searchbox, 'Django')

    expect(screen.getByTestId('current-path')).toHaveTextContent('/')

    await user.keyboard('{Enter}')

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

  it('places profile actions and logout inside the account menu', async () => {
    const user = userEvent.setup()
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
      screen.queryByRole('button', { name: 'Log out' }),
    ).not.toBeInTheDocument()

    const profileButton = screen.getByRole('button', {
      name: "Open Arya's profile menu",
    })
    expect(profileButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(profileButton)

    expect(profileButton).toHaveAttribute('aria-expanded', 'true')
    const profileMenu = screen.getByRole('navigation', {
      name: 'Profile menu',
    })
    expect(
      within(profileMenu).getByRole('link', { name: 'View profile' }),
    ).toHaveAttribute('href', '/profile/arya')
    expect(
      within(profileMenu).getByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('href', '/settings')
    expect(
      within(profileMenu).getByRole('button', { name: 'Log out' }),
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

  it('closes the profile menu without interrupting another navigation control', async () => {
    const user = userEvent.setup()
    renderNavbar('/dashboard', {
      user: currentUser,
      isAuthenticated: true,
    })

    await user.click(
      screen.getByRole('button', {
        name: "Open Arya's profile menu",
      }),
    )
    expect(
      screen.getByRole('navigation', { name: 'Profile menu' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Open navigation' }),
    )

    expect(
      screen.queryByRole('navigation', { name: 'Profile menu' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Close navigation' }),
    ).toBeInTheDocument()
  })

  it('exposes the backend moderation workspace to staff only', () => {
    const {rerender} = renderNavbar('/dashboard', {
      user: currentUser,
      isAuthenticated: true,
    })

    expect(
      screen.queryByRole('link', {name: 'Moderation'}),
    ).not.toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthContext.Provider value={{
          ...signedOutAuth,
          user: {...currentUser, is_staff: true},
          isAuthenticated: true,
        }}>
          <AppNavbar />
          <CurrentPath />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', {name: 'Moderation'}),
    ).toHaveAttribute('href', '/moderation')
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
      screen.getByRole('button', {
        name: "Open Arya's profile menu",
      }),
    )
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
      screen.getByRole('button', {
        name: "Open Arya's profile menu",
      }),
    )
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
