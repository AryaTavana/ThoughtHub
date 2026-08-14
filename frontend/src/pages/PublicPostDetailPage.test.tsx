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

import { ApiError } from '../api/client'
import {
  getPostComments,
  type PublicComment,
} from '../api/comments'
import type { PaginatedResponse } from '../api/pagination'
import {
  getPublishedPost,
  type PublicPostDetail,
} from '../api/posts'
import { PublicPostDetailPage } from './PublicPostDetailPage'

vi.mock('../api/comments', () => ({
  getPostComments: vi.fn(),
}))

vi.mock('../api/posts', () => ({
  getPublishedPost: vi.fn(),
}))

const getPostCommentsMock = vi.mocked(getPostComments)
const getPublishedPostMock = vi.mocked(getPublishedPost)

const emptyCommentsPage: PaginatedResponse<PublicComment> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

const publishedPost: PublicPostDetail = {
  id: 12,
  title: 'Learning Django and React',
  slug: 'learning-django-and-react',
  excerpt: 'A practical guide to connecting both frameworks.',
  author_username: 'arya',
  category: {
    id: 3,
    name: 'Programming',
    slug: 'programming',
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
  published_at: '2026-07-30T08:45:00Z',
  reading_time: 7,
  content: 'A safe introduction to the article.',
  blocks: [
    {
      id: 31,
      block_type: 'rich_text',
      position: 0,
      content:
        '<h2>First block</h2><p>Allowed <strong>formatting</strong>.</p><script>alert("unsafe")</script>',
      image: null,
      image_alt: '',
      caption: '',
      image_width: 'content',
      video_url: '',
      quote_attribution: '',
    },
    {
      id: 32,
      block_type: 'quote',
      position: 1,
      content: 'Second quote',
      image: null,
      image_alt: '',
      caption: '',
      image_width: 'content',
      video_url: '',
      quote_attribution: 'ThoughtHub editor',
    },
  ],
  allow_comments: false,
  meta_title: 'Django and React Guide',
  meta_description: 'Learn how Django and React work together.',
  updated_at: '2026-07-30T09:30:00Z',
}

function renderDetailPage(
  path = '/posts/learning-django-and-react',
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/posts/:slug"
          element={<PublicPostDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicPostDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    document.title = 'ThoughtHub tests'
    getPostCommentsMock.mockResolvedValue(emptyCommentsPage)
    getPublishedPostMock.mockResolvedValue(publishedPost)
  })

  it('shows a loading state and requests the route slug', () => {
    getPublishedPostMock.mockReturnValue(
      new Promise(() => {}),
    )

    renderDetailPage()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading post…',
    )
    expect(getPublishedPostMock).toHaveBeenCalledWith(
      'learning-django-and-react',
    )
  })

  it('renders complete post content and restores the document title', async () => {
    const { container, unmount } = renderDetailPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Learning Django and React',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Django and React Guide')
    expect(
      screen.getByText(
        'A practical guide to connecting both frameworks.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('A safe introduction to the article.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Programming')).toBeInTheDocument()
    expect(screen.getByText('#Django')).toBeInTheDocument()
    expect(screen.getByText('#React')).toBeInTheDocument()
    expect(screen.getByText('By arya')).toBeInTheDocument()
    expect(screen.getByText('7 min read')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Django and React logos',
      }),
    ).toHaveAttribute('src', '/media/posts/guide.jpg')
    expect(
      screen.getByRole('heading', { name: 'First block' }),
    ).toBeInTheDocument()
    expect(screen.getByText('formatting')).toHaveProperty(
      'tagName',
      'STRONG',
    )
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('Second quote')).toBeInTheDocument()
    expect(
      screen.getByText('ThoughtHub editor'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('No comments yet.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Comments are closed for this post.'),
    ).toHaveTextContent(
      'Comments are closed for this post.',
    )
    expect(getPostCommentsMock).toHaveBeenCalledWith(
      'learning-django-and-react',
      { page: 1 },
    )

    const firstBlock = screen.getByText('First block')
    const secondBlock = screen.getByText('Second quote')
    expect(
      firstBlock.compareDocumentPosition(secondBlock) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    unmount()
    expect(document.title).toBe('ThoughtHub tests')
  })

  it('keeps introduction markup escaped as ordinary text', async () => {
    getPublishedPostMock.mockResolvedValue({
      ...publishedPost,
      content: '<script>alert("introduction")</script>',
      blocks: [],
    })
    const { container } = renderDetailPage()

    expect(
      await screen.findByText(
        '<script>alert("introduction")</script>',
      ),
    ).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })

  it('renders supported introduction markup and sanitizes unsafe tags', async () => {
    getPublishedPostMock.mockResolvedValue({
      ...publishedPost,
      content:
        '<p>A <strong>formatted</strong> introduction.</p><script>alert("unsafe")</script>',
      blocks: [],
    })
    const { container } = renderDetailPage()

    expect(
      await screen.findByText('formatted'),
    ).toHaveProperty('tagName', 'STRONG')
    expect(
      screen.getByText('formatted').closest('p'),
    ).toHaveTextContent('A formatted introduction.')
    expect(container.querySelector('script')).toBeNull()
    expect(container).not.toHaveTextContent('<p>')
  })

  it('shows a dedicated not-found state for a 404 response', async () => {
    getPublishedPostMock.mockRejectedValue(
      new ApiError(
        'Not found.',
        404,
        { detail: 'Not found.' },
      ),
    )

    renderDetailPage('/posts/missing-post')

    expect(
      await screen.findByRole('heading', {
        name: 'Post not found',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Browse published posts',
      }),
    ).toHaveAttribute('href', '/')
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument()
  })

  it('shows a general error and retries the request', async () => {
    getPublishedPostMock
      .mockRejectedValueOnce(
        new Error('Django is unavailable.'),
      )
      .mockResolvedValueOnce(publishedPost)
    const user = userEvent.setup()
    renderDetailPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Django is unavailable.',
    )

    await user.click(
      screen.getByRole('button', { name: 'Try again' }),
    )

    expect(getPublishedPostMock).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByRole('heading', {
        name: 'Learning Django and React',
      }),
    ).toBeInTheDocument()
  })

  it('reports a missing slug without sending an API request', async () => {
    render(
      <MemoryRouter>
        <PublicPostDetailPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The post address is invalid.',
    )
    expect(getPublishedPostMock).not.toHaveBeenCalled()
  })

  it('ignores a late result from a cancelled effect', async () => {
    let resolveAbandonedRequest: (
      post: PublicPostDetail,
    ) => void = () => {}
    let resolveActiveRequest: (
      post: PublicPostDetail,
    ) => void = () => {}

    getPublishedPostMock
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
        <MemoryRouter
          initialEntries={[
            '/posts/learning-django-and-react',
          ]}
        >
          <Routes>
            <Route
              path="/posts/:slug"
              element={<PublicPostDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(getPublishedPostMock).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      resolveActiveRequest({
        ...publishedPost,
        title: 'Active request post',
        meta_title: '',
      })
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Active request post',
      }),
    ).toBeInTheDocument()

    await act(async () => {
      resolveAbandonedRequest({
        ...publishedPost,
        title: 'Abandoned request post',
        meta_title: '',
      })
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
    expect(document.title).toBe('Active request post')
  })
})
