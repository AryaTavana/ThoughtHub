import {
  render,
  screen,
  waitFor,
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

import type { NotificationItem } from '../api/notifications'
import {
  confirmPasswordReset,
  getPublicUserProfile,
  requestPasswordReset,
} from '../api/auth'
import { ApiError } from '../api/client'
import {
  getCategories,
  getPublishedPosts,
  getTags,
  type PaginatedResponse,
  type PublicPostListItem,
} from '../api/posts'
import type { SavedPostRecord } from '../api/savedPosts'
import { useAuth } from '../auth/useAuth'
import {
  NotificationsContext,
  type NotificationsContextValue,
} from '../notifications-context'
import {
  SavedPostsContext,
  type SavedPostsContextValue,
} from '../saved-posts-context'
import {
  NotificationsPage,
  HelpCenterPage,
  PasswordRecoveryPage,
  PublicProfilePage,
  SavedPostsPage,
  SearchPage,
  CategoriesTagsPage,
  CategoryPage,
  TagPage,
} from './CommunityPages'

vi.mock('../api/posts', () => ({
  getCategories: vi.fn(),
  getPublishedPosts: vi.fn(),
  getTags: vi.fn(),
  getAuthorPost: vi.fn(),
}))

vi.mock('../api/auth', () => ({
  confirmPasswordReset: vi.fn(),
  getPublicUserProfile: vi.fn(),
  requestPasswordReset: vi.fn(),
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const getPublishedPostsMock = vi.mocked(getPublishedPosts)
const getCategoriesMock = vi.mocked(getCategories)
const getTagsMock = vi.mocked(getTags)
const getPublicUserProfileMock = vi.mocked(getPublicUserProfile)
const requestPasswordResetMock = vi.mocked(requestPasswordReset)
const confirmPasswordResetMock = vi.mocked(confirmPasswordReset)
const useAuthMock = vi.mocked(useAuth)

const djangoPost: PublicPostListItem = {
  id: 1,
  title: 'Learning Django',
  slug: 'learning-django',
  excerpt: 'A practical Django guide.',
  author_username: 'arya',
  category: {
    id: 1,
    name: 'Development',
    slug: 'development',
    description: 'Software projects and engineering.',
  },
  tags: [],
  featured_image: null,
  featured_image_alt: '',
  post_type: 'tutorial',
  is_featured: false,
  published_at: '2026-08-13T08:00:00Z',
  reading_time: 4,
  views: 8,
  comments: 2,
}

const reactPost: PublicPostListItem = {
  ...djangoPost,
  id: 2,
  title: 'React State',
  slug: 'react-state',
  excerpt: 'A practical React guide.',
}

function page(
  results: PublicPostListItem[],
): PaginatedResponse<PublicPostListItem> {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  }
}

describe('live community features', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      initializationError: null,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('searches the backend automatically while typing', async () => {
    getPublishedPostsMock.mockImplementation(
      async (parameters = {}) =>
        parameters.search === 'Django'
          ? page([djangoPost])
          : page([djangoPost, reactPost]),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('link', { name: 'React State' }),
    ).toBeInTheDocument()

    await user.type(
      screen.getByRole('searchbox', {
        name: 'Search published posts by title, author, category, or tag',
      }),
      'Django',
    )

    await waitFor(() => {
      expect(getPublishedPostsMock).toHaveBeenLastCalledWith({
        page: 1,
        search: 'Django',
      })
    })
    expect(
      await screen.findByText('1 result'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'React State' }),
    ).not.toBeInTheDocument()
  })

  it('renders account-backed saved posts and removes through context', async () => {
    const toggleSavedPost = vi.fn(async () => {})
    const savedPost: SavedPostRecord = {
      id: 11,
      post: djangoPost,
      saved_at: '2026-08-13T09:00:00Z',
    }
    const context: SavedPostsContextValue = {
      isAuthenticated: true,
      savedPosts: [savedPost],
      savedSlugs: new Set([djangoPost.slug]),
      pendingSlugs: new Set(),
      isLoading: false,
      error: null,
      toggleSavedPost,
      refreshSavedPosts: vi.fn(async () => {}),
    }
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SavedPostsContext.Provider value={context}>
          <SavedPostsPage />
        </SavedPostsContext.Provider>
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Remove Learning Django from saved posts',
      }),
    )

    expect(toggleSavedPost).toHaveBeenCalledWith('learning-django')
  })

  it('renders notifications and marks them read through context', async () => {
    const markRead = vi.fn(async () => {})
    const notification: NotificationItem = {
      id: 4,
      kind: 'new_comment',
      title: 'Sam commented on “Learning Django”',
      message: 'This helped with my project.',
      actor_username: 'sam',
      post_title: 'Learning Django',
      post_slug: 'learning-django',
      target_url: '/posts/learning-django#discussion',
      is_read: false,
      created_at: '2026-08-13T09:00:00Z',
    }
    const context: NotificationsContextValue = {
      notifications: [notification],
      unreadCount: 1,
      isLoading: false,
      error: null,
      markRead,
      markAllRead: vi.fn(async () => {}),
      refreshNotifications: vi.fn(async () => {}),
    }
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NotificationsContext.Provider value={context}>
          <NotificationsPage />
        </NotificationsContext.Provider>
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Sam commented on “Learning Django”'),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Mark as read' }),
    )
    expect(markRead).toHaveBeenCalledWith(4)
  })

  it('returns a real not-found state for an unknown profile', async () => {
    getPublicUserProfileMock.mockRejectedValue(
      new ApiError('Not found.', 404, {detail: 'Not found.'}),
    )
    getPublishedPostsMock.mockResolvedValue(page([]))

    render(
      <MemoryRouter initialEntries={['/profile/missing-user']}>
        <Routes>
          <Route path="/profile/:username" element={<PublicProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {name: 'Profile not found'}),
    ).toBeInTheDocument()
    expect(getPublishedPostsMock).toHaveBeenCalledWith({
      author: 'missing-user',
      page: 1,
    })
  })

  it('loads category matches using the exact backend category filter', async () => {
    getPublishedPostsMock.mockResolvedValue(page([]))
    getCategoriesMock.mockResolvedValue([
      {
        id: 1,
        name: 'Missing category',
        slug: 'missing-category',
        description: '',
      },
    ])

    render(
      <MemoryRouter initialEntries={['/categories/missing-category']}>
        <Routes>
          <Route path="/categories/:category" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {name: 'No posts in this category'}),
    ).toBeInTheDocument()
    expect(getPublishedPostsMock).toHaveBeenCalledWith({
      page: 1,
      category: 'missing-category',
    })
    expect(
      screen.queryByRole('link', {name: 'Learning Django'}),
    ).not.toBeInTheDocument()
  })

  it('lists backend categories and tags on their distinct routes', async () => {
    getCategoriesMock.mockResolvedValue([
      {
        id: 1,
        name: 'Development',
        slug: 'development',
        description: 'Software projects and engineering.',
      },
    ])
    getTagsMock.mockResolvedValue([
      {id: 2, name: 'Testing', slug: 'testing'},
    ])

    render(<MemoryRouter><CategoriesTagsPage /></MemoryRouter>)

    expect(
      await screen.findByRole('link', {name: /Development/}),
    ).toHaveAttribute('href', '/categories/development')
    expect(
      screen.getByRole('link', {name: /#Testing/}),
    ).toHaveAttribute('href', '/tags/testing')
    expect(getCategoriesMock).toHaveBeenCalledOnce()
    expect(getTagsMock).toHaveBeenCalledOnce()
  })

  it('loads tag matches using the exact backend tag filter', async () => {
    getPublishedPostsMock.mockResolvedValue(page([djangoPost]))
    getTagsMock.mockResolvedValue([
      {id: 2, name: 'Testing', slug: 'testing'},
    ])

    render(
      <MemoryRouter initialEntries={['/tags/testing']}>
        <Routes>
          <Route path="/tags/:tag" element={<TagPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {name: 'Testing'}),
    ).toBeInTheDocument()
    expect(getPublishedPostsMock).toHaveBeenCalledWith({
      page: 1,
      tag: 'testing',
    })
  })

  it('requests a real one-use password reset link', async () => {
    requestPasswordResetMock.mockResolvedValue({detail: 'Sent.'})
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/password-recovery']}>
        <Routes>
          <Route path="/password-recovery" element={<PasswordRecoveryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(
      screen.getByRole('textbox', {name: 'Email address'}),
      'arya@example.com',
    )
    await user.click(screen.getByRole('button', {name: 'Send reset link'}))

    expect(requestPasswordResetMock).toHaveBeenCalledWith('arya@example.com')
    expect(
      await screen.findByRole('heading', {name: 'Check your inbox'}),
    ).toBeInTheDocument()
  })

  it('confirms a password through the tokenized route', async () => {
    confirmPasswordResetMock.mockResolvedValue({detail: 'Updated.'})
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/password-recovery/Nw/token-123']}>
        <Routes>
          <Route
            path="/password-recovery/:uid/:token"
            element={<PasswordRecoveryPage />}
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(
      screen.getByLabelText('New password'),
      'StrongPassword456!',
    )
    await user.type(
      screen.getByLabelText('Confirm new password'),
      'StrongPassword456!',
    )
    await user.click(screen.getByRole('button', {name: 'Update password'}))

    expect(confirmPasswordResetMock).toHaveBeenCalledWith({
      uid: 'Nw',
      token: 'token-123',
      new_password: 'StrongPassword456!',
      new_password_confirm: 'StrongPassword456!',
    })
    expect(
      await screen.findByRole('heading', {name: 'Your new password is ready'}),
    ).toBeInTheDocument()
  })

  it('filters help content as the user searches', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><HelpCenterPage /></MemoryRouter>)

    await user.type(
      screen.getByRole('searchbox', {name: 'Search help articles'}),
      'password',
    )

    expect(screen.getByText('Account and profile')).toBeInTheDocument()
    expect(screen.getByText('Why can’t I sign in?')).toBeInTheDocument()
    expect(
      screen.queryByText('Writing and publishing'),
    ).not.toBeInTheDocument()
  })
})
