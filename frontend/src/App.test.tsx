import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { CurrentUser } from './api/auth'
import App from './App'
import {
  AuthContext,
  type AuthContextValue,
} from './auth/auth-context'

vi.mock('./api/posts', () => ({
  getAuthorPost: vi.fn(
    () => new Promise(() => {}),
  ),
  getAuthorPosts: vi.fn(
    () => new Promise(() => {}),
  ),
  getCategories: vi.fn(
    () => new Promise(() => {}),
  ),
  getPublishedPost: vi.fn(
    () => new Promise(() => {}),
  ),
  getPublishedPosts: vi.fn(
    () => new Promise(() => {}),
  ),
  getTags: vi.fn(
    () => new Promise(() => {}),
  ),
}))

vi.mock('./api/comments', () => ({
  getAuthorComments: vi.fn(
    () => new Promise(() => {}),
  ),
  getPostComments: vi.fn(
    () => new Promise(() => {}),
  ),
  submitPostComment: vi.fn(
    () => new Promise(() => {}),
  ),
}))

const signedOutAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isInitializing: false,
  initializationError: null,
  login: vi.fn(),
  register: vi.fn(),
  updateProfile: vi.fn(),
  logout: vi.fn(),
}

const currentUser: CurrentUser = {
  id: 7,
  username: 'arya',
  email: 'arya@example.com',
  first_name: 'Arya',
  last_name: 'Tavana',
  is_staff: false,
}

function renderRoute(
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
        <App />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('application routes', () => {
  it('renders the home page with signed-out navigation', () => {
    renderRoute('/')

    expect(
      screen.getByRole('heading', { name: 'ThoughtHub' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', {
        name: 'Primary navigation',
      }),
    ).toBeInTheDocument()
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
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveAttribute('href', '#main-content')
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it.each([
    ['/login', 'Log in'],
    ['/register', 'Create account'],
  ])('renders %s at its matching route', (path, heading) => {
    renderRoute(path)

    expect(
      screen.getByRole('heading', { name: heading }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('renders a public post detail route without authentication', () => {
    renderRoute('/posts/example-post')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading post…',
    )
  })

  it('routes backend classifications through categories and tags', async () => {
    renderRoute('/categories')

    expect(await screen.findByRole('heading', {
      name: 'Categories and tags',
    })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading categories and tags…',
    )
  })

  it('removes the unsupported topics route', () => {
    renderRoute('/topics')

    expect(
      screen.getByRole('heading', {name: 'Page not found'}),
    ).toBeInTheDocument()
  })

  it('redirects a signed-out dashboard visitor to login', () => {
    renderRoute('/dashboard')

    expect(
      screen.getByRole('heading', { name: 'Log in' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Your writing, all in one place.',
      }),
    ).not.toBeInTheDocument()
  })

  it('renders the dashboard for an authenticated user', () => {
    renderRoute('/dashboard', {
      user: currentUser,
      isAuthenticated: true,
    })

    expect(
      screen.getByRole('heading', {
        name: 'Your writing, all in one place.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Loading your posts…'),
    ).toBeInTheDocument()
  })

  it('keeps moderation hidden from regular users', async () => {
    renderRoute('/moderation', {
      user: currentUser,
      isAuthenticated: true,
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Your writing, all in one place.',
      }),
    ).toBeInTheDocument()
  })

  it('connects staff users to the backend moderation workspace', async () => {
    renderRoute('/moderation', {
      user: {...currentUser, is_staff: true},
      isAuthenticated: true,
    })

    expect(
      await screen.findByRole('heading', {name: 'Moderation'}),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {name: 'Open administrator workspace'}),
    ).toHaveAttribute('href', '/admin/')
  })

  it.each([
    '/dashboard/posts/new',
    '/dashboard/posts/12/edit',
  ])('protects and renders the post editor route %s', (path) => {
    renderRoute(path, {
      user: currentUser,
      isAuthenticated: true,
    })

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading post editor…',
    )
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
