import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { ApiError, apiRequest } from './client'
import {
  getPublishedPosts,
  type PaginatedResponse,
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
})
