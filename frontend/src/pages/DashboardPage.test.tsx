import {
  StrictMode,
  act,
} from 'react'
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getAuthorComments,
  type AuthorCommentListItem,
} from '../api/comments'
import {
  getAuthorPosts,
  type AuthorPostListItem,
  type PaginatedResponse,
} from '../api/posts'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/posts', () => ({
  getAuthorPosts: vi.fn(),
}))

vi.mock('../api/comments', () => ({
  getAuthorComments: vi.fn(),
}))

const getAuthorPostsMock = vi.mocked(getAuthorPosts)
const getAuthorCommentsMock = vi.mocked(getAuthorComments)

const publishedPost: AuthorPostListItem = {
  id: 12,
  title: 'Published architecture guide',
  slug: 'published-architecture-guide',
  excerpt: 'A guide to the application architecture.',
  author_username: 'arya',
  category: {
    id: 3,
    name: 'Development',
    slug: 'development',
  },
  tags: [
    {
      id: 5,
      name: 'Django',
      slug: 'django',
    },
  ],
  featured_image: '/media/posts/architecture.jpg',
  featured_image_alt: 'Application architecture diagram',
  post_type: 'tutorial',
  published_at: '2026-07-28T08:45:00Z',
  reading_time: 6,
  status: 'published',
  review_feedback: '',
  date_posted: '2026-07-27T08:45:00Z',
  updated_at: '2026-07-30T09:30:00Z',
}

const removedPost: AuthorPostListItem = {
  ...publishedPost,
  id: 13,
  title: 'Article needing revision',
  slug: 'article-needing-revision',
  published_at: null,
  status: 'removed',
  featured_image: null,
  featured_image_alt: '',
  review_feedback: 'Please add sources for the main claim.',
  updated_at: '2026-07-30T10:00:00Z',
}

const postsPage: PaginatedResponse<AuthorPostListItem> = {
  count: 2,
  next: null,
  previous: null,
  results: [publishedPost, removedPost],
}

const emptyPage: PaginatedResponse<AuthorPostListItem> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

const emptyCommentsPage: PaginatedResponse<AuthorCommentListItem> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

function createPage(
  post: AuthorPostListItem,
  overrides: Partial<
    PaginatedResponse<AuthorPostListItem>
  > = {},
): PaginatedResponse<AuthorPostListItem> {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [post],
    ...overrides,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getAuthorPostsMock.mockResolvedValue(emptyPage)
    getAuthorCommentsMock.mockResolvedValue(emptyCommentsPage)
  })

  it('shows a loading state while author posts are requested', () => {
    getAuthorPostsMock.mockReturnValue(new Promise(() => {}))

    renderDashboard()

    expect(
      screen.getByText('Loading your posts…'),
    ).toBeInTheDocument()
    expect(getAuthorPostsMock).toHaveBeenCalledWith({
      page: 1,
    })
  })

  it('renders workflow data, feedback, and a published post link', async () => {
    getAuthorPostsMock.mockResolvedValue(postsPage)

    renderDashboard()

    expect(
      await screen.findByRole('heading', {
        name: 'Published architecture guide',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 posts')).toBeInTheDocument()
    expect(screen.getByText('published')).toBeInTheDocument()
    expect(screen.getByText('removed')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Please add sources for the main claim.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'View' }),
    ).toHaveAttribute(
      'href',
      '/posts/published-architecture-guide',
    )
    expect(
      screen.getAllByRole('link', { name: 'View' }),
    ).toHaveLength(1)
    expect(
      screen.getAllByRole('link', { name: 'Edit' }),
    ).toHaveLength(2)
    expect(
      screen.getAllByRole('link', { name: 'Edit' })[0],
    ).toHaveAttribute('href', '/dashboard/posts/12/edit')
    expect(
      screen.getByRole('link', { name: 'New post' }),
    ).toHaveAttribute('href', '/dashboard/posts/new')
    expect(
      screen.getByRole('img', {
        name: 'Application architecture diagram',
      }),
    ).toHaveAttribute('src', '/media/posts/architecture.jpg')
  })

  it('shows an author their comment status and moderation feedback', async () => {
    getAuthorCommentsMock.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 40,
          post_title: 'Campus technology',
          post_slug: 'campus-technology',
          post_status: 'published',
          content: 'A comment that was removed.',
          status: 'removed',
          moderation_feedback:
            'Please keep comments related to the post.',
          created_at: '2026-07-30T10:00:00Z',
          updated_at: '2026-07-30T11:00:00Z',
        },
      ],
    })

    renderDashboard()

    expect(
      await screen.findByRole('link', {
        name: 'Campus technology',
      }),
    ).toHaveAttribute('href', '/posts/campus-technology')
    expect(
      screen.getByText('A comment that was removed.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Please keep comments related to the post.',
      ),
    ).toBeInTheDocument()
  })

  it('renders an empty state for a new author', async () => {
    renderDashboard()

    expect(
      await screen.findByRole('heading', {
        name: 'No posts yet',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Your first draft will appear here.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Create your first post',
      }),
    ).toHaveAttribute('href', '/dashboard/posts/new')
  })

  it('shows an API error and retries the request', async () => {
    getAuthorPostsMock
      .mockRejectedValueOnce(new Error('Django is unavailable.'))
      .mockResolvedValueOnce(emptyPage)
    const user = userEvent.setup()
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Django is unavailable.',
    )

    await user.click(
      screen.getByRole('button', { name: 'Try again' }),
    )

    expect(getAuthorPostsMock).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByRole('heading', {
        name: 'No posts yet',
      }),
    ).toBeInTheDocument()
  })

  it('loads the next and previous dashboard pages', async () => {
    const firstPage = createPage(publishedPost, {
      count: 2,
      next: 'http://localhost:8000/api/dashboard/posts/?page=2',
    })
    const secondPagePost: AuthorPostListItem = {
      ...removedPost,
      id: 30,
      title: 'Second page draft',
      slug: 'second-page-draft',
      status: 'draft',
      review_feedback: '',
    }
    const secondPage = createPage(secondPagePost, {
      count: 2,
      previous: 'http://localhost:8000/api/dashboard/posts/',
    })
    getAuthorPostsMock.mockImplementation(
      async (parameters = {}) =>
        parameters.page === 2 ? secondPage : firstPage,
    )
    const user = userEvent.setup()
    renderDashboard()

    expect(
      await screen.findByRole('heading', {
        name: 'Published architecture guide',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Previous' }),
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: 'Next' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Second page draft',
      }),
    ).toBeInTheDocument()
    expect(getAuthorPostsMock).toHaveBeenCalledWith({
      page: 2,
    })
    expect(screen.getByText('Page 2')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next' }),
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: 'Previous' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Published architecture guide',
      }),
    ).toBeInTheDocument()
    expect(getAuthorPostsMock).toHaveBeenLastCalledWith({
      page: 1,
    })
  })

  it('ignores a late result from a cancelled effect', async () => {
    let resolveAbandonedRequest: (
      page: PaginatedResponse<AuthorPostListItem>,
    ) => void = () => {}
    let resolveActiveRequest: (
      page: PaginatedResponse<AuthorPostListItem>,
    ) => void = () => {}

    getAuthorPostsMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveAbandonedRequest = resolve
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveActiveRequest = resolve
        }),
      )

    render(
      <StrictMode>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(getAuthorPostsMock).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      resolveActiveRequest(
        createPage({
          ...publishedPost,
          id: 20,
          title: 'Active request post',
          slug: 'active-request-post',
        }),
      )
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Active request post',
      }),
    ).toBeInTheDocument()

    await act(async () => {
      resolveAbandonedRequest(
        createPage({
          ...publishedPost,
          id: 21,
          title: 'Abandoned request post',
          slug: 'abandoned-request-post',
        }),
      )
    })

    expect(
      screen.getByRole('heading', {
        name: 'Active request post',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Abandoned request post',
      }),
    ).not.toBeInTheDocument()
  })
})
