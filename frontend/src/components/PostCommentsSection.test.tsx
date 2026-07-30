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
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getPostComments,
  type PublicComment,
} from '../api/comments'
import type { PaginatedResponse } from '../api/pagination'
import { PostCommentsSection } from './PostCommentsSection'

vi.mock('../api/comments', () => ({
  getPostComments: vi.fn(),
}))

const getPostCommentsMock = vi.mocked(getPostComments)

const firstComment: PublicComment = {
  id: 19,
  author_username: 'Deleted user',
  content: 'A preserved approved comment.',
  created_at: '2026-07-30T10:15:00Z',
}

const secondComment: PublicComment = {
  id: 18,
  author_username: 'arya',
  content: 'First line.\nSecond line.',
  created_at: '2026-07-30T10:00:00Z',
}

const firstPage: PaginatedResponse<PublicComment> = {
  count: 2,
  next: 'http://localhost:8000/api/posts/example/comments/?page=2',
  previous: null,
  results: [firstComment],
}

const secondPage: PaginatedResponse<PublicComment> = {
  count: 2,
  next: null,
  previous:
    'http://localhost:8000/api/posts/example/comments/',
  results: [secondComment],
}

const emptyPage: PaginatedResponse<PublicComment> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
}

describe('PostCommentsSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getPostCommentsMock.mockResolvedValue(emptyPage)
  })

  it('shows a loading state and requests the first comment page', () => {
    getPostCommentsMock.mockReturnValue(
      new Promise(() => {}),
    )

    render(<PostCommentsSection slug="example" />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading comments…',
    )
    expect(getPostCommentsMock).toHaveBeenCalledWith(
      'example',
      { page: 1 },
    )
  })

  it('renders approved comments, counts, authors, and dates safely', async () => {
    getPostCommentsMock.mockResolvedValue({
      ...firstPage,
      next: null,
      results: [
        firstComment,
        {
          ...secondComment,
          content:
            '<script>alert("comment")</script>\nSecond line.',
        },
      ],
    })
    const { container } = render(
      <PostCommentsSection slug="example" />,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Deleted user',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 comments')).toBeInTheDocument()
    expect(
      screen.getByText('A preserved approved comment.'),
    ).toBeInTheDocument()
    const escapedComment = screen.getByText(
      (_content, element) =>
        element?.tagName === 'P' &&
        element.textContent ===
          '<script>alert("comment")</script>\nSecond line.',
    )
    expect(escapedComment).toBeInTheDocument()
    expect(escapedComment).toHaveStyle({
      whiteSpace: 'pre-wrap',
    })
    expect(container.querySelector('script')).toBeNull()
    expect(
      container.querySelector(
        'time[datetime="2026-07-30T10:15:00Z"]',
      ),
    ).toBeInTheDocument()
  })

  it('renders an empty state when no comments are approved', async () => {
    render(<PostCommentsSection slug="example" />)

    expect(
      await screen.findByText('No approved comments yet.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', {
        name: 'Comment pages',
      }),
    ).not.toBeInTheDocument()
  })

  it('shows a load error and retries the request', async () => {
    getPostCommentsMock
      .mockRejectedValueOnce(
        new Error('Unable to reach Django.'),
      )
      .mockResolvedValueOnce(emptyPage)
    const user = userEvent.setup()

    render(<PostCommentsSection slug="example" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to reach Django.',
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Try loading comments again',
      }),
    )

    expect(getPostCommentsMock).toHaveBeenCalledTimes(2)
    expect(
      await screen.findByText('No approved comments yet.'),
    ).toBeInTheDocument()
  })

  it('loads next and previous comment pages', async () => {
    getPostCommentsMock.mockImplementation(
      async (_slug, parameters = {}) =>
        parameters.page === 2 ? secondPage : firstPage,
    )
    const user = userEvent.setup()

    render(<PostCommentsSection slug="example" />)

    expect(
      await screen.findByText(
        'A preserved approved comment.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Previous comments',
      }),
    ).toBeDisabled()

    await user.click(
      screen.getByRole('button', {
        name: 'Next comments',
      }),
    )

    expect(
      await screen.findByText('First line. Second line.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Page 2')).toBeInTheDocument()
    expect(getPostCommentsMock).toHaveBeenCalledWith(
      'example',
      { page: 2 },
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Previous comments',
      }),
    )

    expect(
      await screen.findByText(
        'A preserved approved comment.',
      ),
    ).toBeInTheDocument()
    expect(getPostCommentsMock).toHaveBeenLastCalledWith(
      'example',
      { page: 1 },
    )
  })

  it('ignores a late result from a cancelled effect', async () => {
    let resolveAbandonedRequest: (
      page: PaginatedResponse<PublicComment>,
    ) => void = () => {}
    let resolveActiveRequest: (
      page: PaginatedResponse<PublicComment>,
    ) => void = () => {}

    getPostCommentsMock
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
        <PostCommentsSection slug="example" />
      </StrictMode>,
    )

    await waitFor(() => {
      expect(getPostCommentsMock).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      resolveActiveRequest({
        ...emptyPage,
        count: 1,
        results: [
          {
            ...firstComment,
            content: 'Active request comment.',
          },
        ],
      })
    })

    expect(
      await screen.findByText('Active request comment.'),
    ).toBeInTheDocument()

    await act(async () => {
      resolveAbandonedRequest({
        ...emptyPage,
        count: 1,
        results: [
          {
            ...firstComment,
            content: 'Abandoned request comment.',
          },
        ],
      })
    })

    expect(
      screen.getByText('Active request comment.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Abandoned request comment.'),
    ).not.toBeInTheDocument()
  })
})
