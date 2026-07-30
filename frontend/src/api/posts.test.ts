import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { ApiError, apiRequest } from './client'
import {
  getAuthorPosts,
  getPublishedPost,
  getPublishedPosts,
  type AuthorPostListItem,
  type PaginatedResponse,
  type PublicPostDetail,
  type PublicPostListItem,
} from './posts'

vi.mock('./client', () => ({
  ApiError: class ApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status: number, data: unknown) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.data = data
    }
  },
  apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

const publishedPost: PublicPostListItem = {
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
  featured_image: 'http://localhost:8000/media/posts/guide.jpg',
  featured_image_alt: 'Django and React logos',
  post_type: 'tutorial',
  published_at: '2026-07-30T08:45:00Z',
  reading_time: 6,
}

const firstPage: PaginatedResponse<PublicPostListItem> = {
  count: 12,
  next: 'http://localhost:8000/api/posts/?page=2',
  previous: null,
  results: [publishedPost],
}

const authorDraft: AuthorPostListItem = {
  ...publishedPost,
  id: 20,
  title: 'My unfinished article',
  slug: 'my-unfinished-article',
  status: 'draft',
  review_feedback: '',
  published_at: null,
  date_posted: '2026-07-29T08:00:00Z',
  updated_at: '2026-07-30T10:15:00Z',
}

const authorPostsPage: PaginatedResponse<AuthorPostListItem> = {
  count: 1,
  next: null,
  previous: null,
  results: [authorDraft],
}

const publishedPostDetail: PublicPostDetail = {
  ...publishedPost,
  content: 'An introduction to the complete article.',
  blocks: [
    {
      id: 31,
      block_type: 'rich_text',
      position: 0,
      content: '<p>Start with the Django API.</p>',
      image: null,
      image_alt: '',
      caption: '',
      image_width: 'content',
      video_url: '',
      quote_attribution: '',
    },
    {
      id: 32,
      block_type: 'image',
      position: 1,
      content: '',
      image: 'http://localhost:8000/media/posts/blocks/architecture.jpg',
      image_alt: 'Django and React architecture diagram',
      caption: 'The application architecture',
      image_width: 'wide',
      video_url: '',
      quote_attribution: '',
    },
    {
      id: 33,
      block_type: 'quote',
      position: 2,
      content: 'First make it work, then make it clear.',
      image: null,
      image_alt: '',
      caption: '',
      image_width: 'content',
      video_url: '',
      quote_attribution: 'ThoughtHub editor',
    },
  ],
  allow_comments: true,
  meta_title: 'Learning Django and React',
  meta_description: 'Connect a Django API to a React frontend.',
  updated_at: '2026-07-30T09:30:00Z',
}

describe('published posts API service', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
  })

  it('requests the first page without an unnecessary query string', async () => {
    apiRequestMock.mockResolvedValue(firstPage)

    await expect(getPublishedPosts()).resolves.toEqual(firstPage)
    expect(apiRequestMock).toHaveBeenCalledWith('/api/posts/')
  })

  it('adds the requested page as an encoded query parameter', async () => {
    const secondPage = {
      ...firstPage,
      next: null,
      previous: 'http://localhost:8000/api/posts/',
    }
    apiRequestMock.mockResolvedValue(secondPage)

    await expect(
      getPublishedPosts({ page: 2 }),
    ).resolves.toEqual(secondPage)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/?page=2',
    )
  })

  it('preserves nested post, category, and tag data', async () => {
    apiRequestMock.mockResolvedValue(firstPage)

    const response = await getPublishedPosts()
    const firstPost = response.results[0]

    expect(firstPost).toMatchObject({
      title: 'Learning Django and React',
      category: {
        name: 'Programming',
      },
      tags: [
        { name: 'Django' },
        { name: 'React' },
      ],
      post_type: 'tutorial',
      reading_time: 6,
    })
  })

  it('forwards API failures to the caller', async () => {
    const error = new ApiError(
      'Unable to load posts.',
      503,
      { detail: 'Unable to load posts.' },
    )
    apiRequestMock.mockRejectedValue(error)

    await expect(getPublishedPosts()).rejects.toBe(error)
    expect(apiRequestMock).toHaveBeenCalledWith('/api/posts/')
  })

  it('loads a complete public post by its slug', async () => {
    apiRequestMock.mockResolvedValue(publishedPostDetail)

    await expect(
      getPublishedPost('learning-django-and-react'),
    ).resolves.toEqual(publishedPostDetail)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/learning-django-and-react/',
    )
  })

  it('encodes a Unicode slug as one safe URL segment', async () => {
    apiRequestMock.mockResolvedValue({
      ...publishedPostDetail,
      title: 'آموزش جنگو',
      slug: 'آموزش-جنگو',
    })

    await getPublishedPost('آموزش-جنگو')

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%AC%D9%86%DA%AF%D9%88/',
    )
  })

  it('preserves ordered content-block data', async () => {
    apiRequestMock.mockResolvedValue(publishedPostDetail)

    const response = await getPublishedPost(
      'learning-django-and-react',
    )

    expect(response.blocks).toEqual([
      expect.objectContaining({
        id: 31,
        block_type: 'rich_text',
        position: 0,
        content: '<p>Start with the Django API.</p>',
      }),
      expect.objectContaining({
        id: 32,
        block_type: 'image',
        position: 1,
        image_width: 'wide',
        image_alt: 'Django and React architecture diagram',
      }),
      expect.objectContaining({
        id: 33,
        block_type: 'quote',
        position: 2,
        quote_attribution: 'ThoughtHub editor',
      }),
    ])
    expect(response).toMatchObject({
      allow_comments: true,
      meta_title: 'Learning Django and React',
      meta_description: 'Connect a Django API to a React frontend.',
      updated_at: '2026-07-30T09:30:00Z',
    })
  })

  it('forwards detail API failures to the caller', async () => {
    const error = new ApiError(
      'Not found.',
      404,
      { detail: 'Not found.' },
    )
    apiRequestMock.mockRejectedValue(error)

    await expect(
      getPublishedPost('missing-post'),
    ).rejects.toBe(error)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/posts/missing-post/',
    )
  })
})

describe('author posts API service', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
  })

  it('requests the signed-in author post collection', async () => {
    apiRequestMock.mockResolvedValue(authorPostsPage)

    await expect(getAuthorPosts()).resolves.toEqual(
      authorPostsPage,
    )
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/',
    )
  })

  it('adds the requested dashboard page to the URL', async () => {
    const secondPage = {
      ...authorPostsPage,
      previous: 'http://localhost:8000/api/dashboard/posts/',
    }
    apiRequestMock.mockResolvedValue(secondPage)

    await expect(
      getAuthorPosts({ page: 2 }),
    ).resolves.toEqual(secondPage)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/?page=2',
    )
  })

  it('preserves draft and editorial workflow fields', async () => {
    apiRequestMock.mockResolvedValue(authorPostsPage)

    const response = await getAuthorPosts()

    expect(response.results[0]).toMatchObject({
      id: 20,
      status: 'draft',
      review_feedback: '',
      published_at: null,
      date_posted: '2026-07-29T08:00:00Z',
      updated_at: '2026-07-30T10:15:00Z',
    })
  })

  it('forwards authentication failures to the dashboard page', async () => {
    const error = new ApiError(
      'Authentication credentials were not provided.',
      403,
      {
        detail: 'Authentication credentials were not provided.',
      },
    )
    apiRequestMock.mockRejectedValue(error)

    await expect(getAuthorPosts()).rejects.toBe(error)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/',
    )
  })
})
