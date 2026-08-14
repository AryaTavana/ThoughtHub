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
  getPublishedPosts,
  type PaginatedResponse,
  type PublicPostListItem,
} from '../api/posts'
import type { SavedPostRecord } from '../api/savedPosts'
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
  SavedPostsPage,
  SearchPage,
} from './CommunityPages'

vi.mock('../api/posts', () => ({
  getPublishedPosts: vi.fn(),
  getAuthorPost: vi.fn(),
}))

const getPublishedPostsMock = vi.mocked(getPublishedPosts)

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
  },
  tags: [],
  featured_image: null,
  featured_image_alt: '',
  post_type: 'tutorial',
  published_at: '2026-08-13T08:00:00Z',
  reading_time: 4,
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
      screen.getByRole('searchbox', { name: 'Search posts' }),
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
})
