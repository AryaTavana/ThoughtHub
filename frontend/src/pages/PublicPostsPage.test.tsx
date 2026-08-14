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
  getPublishedPosts,
  type PaginatedResponse,
  type PublicPostListItem,
} from '../api/posts'
import { PublicPostsPage } from './PublicPostsPage'

vi.mock('../api/posts', () => ({
  getPublishedPosts: vi.fn(),
}))

const getPublishedPostsMock = vi.mocked(getPublishedPosts)

const firstPost: PublicPostListItem = {
  id: 12,
  title: 'Learning Django and React',
  slug: 'learning-django-and-react',
  excerpt: 'A practical guide to connecting both frameworks.',
  author_username: 'arya',
  category: {
    id: 3,
    name: 'Programming',
    slug: 'programming',
    description: 'Programming tutorials and projects.',
  },
  tags: [
    {
      id: 5,
      name: 'Django',
      slug: 'django',
    },
    {
      id: 8,
      name: 'React',
      slug: 'react',
    },
  ],
  featured_image: '/media/posts/guide.jpg',
  featured_image_alt: 'Django and React logos',
  post_type: 'tutorial',
  is_featured: true,
  published_at: '2026-07-30T08:45:00Z',
  reading_time: 6,
  views: 24,
  comments: 3,
}

const firstPage: PaginatedResponse<PublicPostListItem> = {
  count: 2,
  next: 'http://localhost:8000/api/posts/?page=2',
  previous: null,
  results: [firstPost],
}

const emptyPage: PaginatedResponse<PublicPostListItem> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

function renderPostsPage() {
  return render(
    <MemoryRouter>
      <PublicPostsPage />
    </MemoryRouter>,
  )
}

function createPost(
  overrides: Partial<PublicPostListItem>,
): PublicPostListItem {
  return {
    ...firstPost,
    ...overrides,
  }
}

function createPage(
  post: PublicPostListItem,
  overrides: Partial<
    PaginatedResponse<PublicPostListItem>
  > = {},
): PaginatedResponse<PublicPostListItem> {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [post],
    ...overrides,
  }
}

describe('PublicPostsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getPublishedPostsMock.mockResolvedValue(emptyPage)
  })

  it('shows a loading state while the request is pending', () => {
    getPublishedPostsMock.mockReturnValue(
      new Promise(() => {}),
    )

    renderPostsPage()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading published posts…',
    )
    expect(getPublishedPostsMock).toHaveBeenCalledWith({
      page: 1,
    })
    expect(
      document.querySelectorAll(
        '.idea-core .thought-hub-icon__image',
      ),
    ).toHaveLength(2)
  })

  it('renders published post data and a detail link', async () => {
    getPublishedPostsMock.mockResolvedValue(firstPage)

    renderPostsPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Latest posts',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 posts')).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Learning Django and React',
      }),
    ).toHaveAttribute(
      'href',
      '/posts/learning-django-and-react',
    )
    expect(
      screen.getByRole('link', {name: 'Learning Django and React'})
        .closest('article'),
    ).toHaveClass('post-card--featured')
    expect(
      screen.getByRole('img', {
        name: 'Django and React logos',
      }),
    ).toHaveAttribute('src', '/media/posts/guide.jpg')
    expect(screen.getAllByText('Programming').length).toBeGreaterThan(0)
    expect(screen.getAllByText('#Django').length).toBeGreaterThan(0)
    expect(screen.getAllByText('#React').length).toBeGreaterThan(0)
    expect(screen.getByText('By arya')).toBeInTheDocument()
    expect(screen.getByText(/6 min read/)).toBeInTheDocument()
    expect(screen.getByText('24 views · 3 comments')).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', {name: 'Programming'})
        .some((link) => link.getAttribute('href') === '/categories/programming'),
    ).toBe(true)
    expect(
      screen.getAllByRole('link', {name: '#Django'})
        .some((link) => link.getAttribute('href') === '/tags/django'),
    ).toBe(true)
    expect(
      screen.getByRole('button', {
        name: 'Save Learning Django and React',
      }),
    ).toHaveTextContent('Save')
  })

  it('renders the uploaded banner in the post card media area', async () => {
    getPublishedPostsMock.mockResolvedValue(
      createPage(firstPost),
    )

    renderPostsPage()

    const banner = await screen.findByRole('img', {
      name: 'Django and React logos',
    })
    expect(banner).toHaveAttribute('src', '/media/posts/guide.jpg')
    expect(banner).toHaveAttribute('loading', 'lazy')
    expect(banner.parentElement).toHaveClass('post-card__media')
  })

  it('keeps tags in the dedicated aligned card slot', async () => {
    getPublishedPostsMock.mockResolvedValue(
      createPage(firstPost),
    )

    renderPostsPage()

    const tags = await screen.findAllByText('#Django')
    expect(
      tags.some((tag) => tag.closest('.post-card__tag-slot') !== null),
    ).toBe(true)
  })

  it('renders an empty state when no posts are published', async () => {
    renderPostsPage()

    expect(
      await screen.findByRole('heading', {
        name: 'No published posts yet',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', {
        name: 'Published post pages',
      }),
    ).not.toBeInTheDocument()
  })

  it('shows an error and retries the request', async () => {
    getPublishedPostsMock
      .mockRejectedValueOnce(
        new Error('Django is unavailable.'),
      )
      .mockResolvedValueOnce(emptyPage)
    const user = userEvent.setup()
    renderPostsPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Django is unavailable.',
    )

    await user.click(
      screen.getByRole('button', { name: 'Try again' }),
    )

    expect(getPublishedPostsMock).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByRole('heading', {
        name: 'No published posts yet',
      }),
    ).toBeInTheDocument()
  })

  it('loads next and previous pages', async () => {
    const secondPost = createPost({
      id: 13,
      title: 'Second page post',
      slug: 'second-page-post',
    })
    const secondPage = createPage(secondPost, {
      count: 2,
      previous: 'http://localhost:8000/api/posts/',
    })
    getPublishedPostsMock.mockImplementation(
      async (parameters = {}) =>
        parameters.page === 2 ? secondPage : firstPage,
    )
    const user = userEvent.setup()
    renderPostsPage()

    expect(
      await screen.findByRole('link', {
        name: 'Learning Django and React',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Previous' }),
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: 'Next' }),
    )

    expect(
      await screen.findByRole('link', {
        name: 'Second page post',
      }),
    ).toBeInTheDocument()
    expect(getPublishedPostsMock).toHaveBeenCalledWith({
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
      await screen.findByRole('link', {
        name: 'Learning Django and React',
      }),
    ).toBeInTheDocument()
    expect(getPublishedPostsMock).toHaveBeenLastCalledWith({
      page: 1,
    })
  })

  it('asks the backend to sort the complete result set', async () => {
    getPublishedPostsMock.mockResolvedValue(firstPage)
    const user = userEvent.setup()
    renderPostsPage()
    await screen.findByRole('link', {name: 'Learning Django and React'})

    await user.click(screen.getByRole('button', {name: 'Most viewed'}))

    await waitFor(() => {
      expect(getPublishedPostsMock).toHaveBeenLastCalledWith({
        page: 1,
        ordering: 'viewed',
      })
    })
  })

  it('ignores a late result from a cancelled effect', async () => {
    let resolveAbandonedRequest: (
      page: PaginatedResponse<PublicPostListItem>,
    ) => void = () => {}
    let resolveActiveRequest: (
      page: PaginatedResponse<PublicPostListItem>,
    ) => void = () => {}

    getPublishedPostsMock
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
          <PublicPostsPage />
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(getPublishedPostsMock).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      resolveActiveRequest(
        createPage(
          createPost({
            id: 20,
            title: 'Active request post',
            slug: 'active-request-post',
          }),
        ),
      )
    })

    expect(
      await screen.findByRole('link', {
        name: 'Active request post',
      }),
    ).toBeInTheDocument()

    await act(async () => {
      resolveAbandonedRequest(
        createPage(
          createPost({
            id: 21,
            title: 'Abandoned request post',
            slug: 'abandoned-request-post',
          }),
        ),
      )
    })

    expect(
      screen.getByRole('link', {
        name: 'Active request post',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: 'Abandoned request post',
      }),
    ).not.toBeInTheDocument()
  })
})
