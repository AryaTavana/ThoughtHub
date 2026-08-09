import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getAuthorComments,
  getPostComments,
  submitPostComment,
  type AuthorCommentListItem,
  type PublicComment,
  type SubmittedComment,
} from './comments'
import { apiRequest } from './client'
import type { PaginatedResponse } from './pagination'

vi.mock('./client', () => ({
  apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

const approvedComments: PaginatedResponse<PublicComment> = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 19,
      author_username: 'Deleted user',
      content: 'A preserved comment.',
      created_at: '2026-07-30T10:15:00Z',
    },
    {
      id: 18,
      author_username: 'arya',
      content: 'A visible approved comment.',
      created_at: '2026-07-30T10:00:00Z',
    },
  ],
}

const publishedComment: SubmittedComment = {
  id: 20,
  author_username: 'arya',
  content: 'A thoughtful response.',
  status: 'approved',
  moderation_feedback: '',
  created_at: '2026-07-30T10:30:00Z',
}

describe('comments API service', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
  })

  it('loads approved comments without an unnecessary query string', async () => {
    apiRequestMock.mockResolvedValue(approvedComments)

    await expect(
      getPostComments('learning-django-and-react'),
    ).resolves.toEqual(approvedComments)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/learning-django-and-react/comments/',
    )
    expect(approvedComments.results[0]).not.toHaveProperty(
      'status',
    )
    expect(approvedComments.results[0]).not.toHaveProperty(
      'moderation_feedback',
    )
  })

  it('adds a numbered comment page to the query string', async () => {
    const secondPage = {
      ...approvedComments,
      next: null,
      previous:
        'http://localhost:8000/api/posts/example/comments/',
    }
    apiRequestMock.mockResolvedValue(secondPage)

    await expect(
      getPostComments('example', { page: 2 }),
    ).resolves.toEqual(secondPage)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/example/comments/?page=2',
    )
  })

  it('encodes a Unicode post slug as one URL segment', async () => {
    apiRequestMock.mockResolvedValue(approvedComments)

    await getPostComments('آموزش-جنگو')

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%AC%D9%86%DA%AF%D9%88/comments/',
    )
  })

  it('submits comment content as JSON and returns its published state', async () => {
    const submission = {
      content: 'A thoughtful response.',
    }
    apiRequestMock.mockResolvedValue(publishedComment)

    await expect(
      submitPostComment(
        'learning-django-and-react',
        submission,
      ),
    ).resolves.toEqual(publishedComment)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/learning-django-and-react/comments/',
      {
        method: 'POST',
        body: JSON.stringify(submission),
      },
    )
  })

  it('loads the author comment history with moderation feedback', async () => {
    const comment: AuthorCommentListItem = {
      id: 30,
      post_title: 'Campus technology',
      post_slug: 'campus-technology',
      post_status: 'published',
      content: 'A removed comment.',
      status: 'removed',
      moderation_feedback: 'Please keep comments on topic.',
      created_at: '2026-07-30T10:00:00Z',
      updated_at: '2026-07-30T11:00:00Z',
    }
    const page: PaginatedResponse<AuthorCommentListItem> = {
      count: 1,
      next: null,
      previous: null,
      results: [comment],
    }
    apiRequestMock.mockResolvedValue(page)

    await expect(
      getAuthorComments({ page: 2 }),
    ).resolves.toEqual(page)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/comments/?page=2',
    )
  })

  it('forwards comment-list failures to the caller', async () => {
    const error = new Error('Unable to load comments.')
    apiRequestMock.mockRejectedValue(error)

    await expect(
      getPostComments('example'),
    ).rejects.toBe(error)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/example/comments/',
    )
  })

  it('forwards comment-submission failures to the caller', async () => {
    const error = new Error('Comments are closed for this post.')
    apiRequestMock.mockRejectedValue(error)

    await expect(
      submitPostComment('example', {
        content: 'A comment.',
      }),
    ).rejects.toBe(error)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/example/comments/',
      {
        method: 'POST',
        body: JSON.stringify({
          content: 'A comment.',
        }),
      },
    )
  })
})
