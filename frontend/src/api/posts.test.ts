import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { ApiError, apiRequest } from './client'
import {
  createAuthorPostBlock,
  createAuthorPost,
  deleteAuthorPostBlock,
  deleteAuthorPost,
  getAuthorPost,
  getAuthorPostBlocks,
  getAuthorPosts,
  getCategories,
  getPublishedPost,
  getPublishedPosts,
  getTags,
  publishAuthorPost,
  reorderAuthorPostBlocks,
  updateAuthorPostBlock,
  updateAuthorPost,
  type AuthorPostBlock,
  type AuthorPostBlockInput,
  type AuthorPostDetail,
  type AuthorPostInput,
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

const authorPostDetail: AuthorPostDetail = {
  id: 20,
  title: 'My unfinished article',
  slug: 'my-unfinished-article',
  excerpt: 'A draft introduction.',
  content: 'The current draft body.',
  category: 3,
  tags: [5, 8],
  featured_image: null,
  featured_image_alt: '',
  post_type: 'article',
  allow_comments: true,
  meta_title: '',
  meta_description: '',
  status: 'draft',
  review_feedback: '',
  published_at: null,
  date_posted: '2026-07-29T08:00:00Z',
  updated_at: '2026-07-30T10:15:00Z',
}

const authorPostInput: AuthorPostInput = {
  title: 'My unfinished article',
  excerpt: 'A draft introduction.',
  content: 'The current draft body.',
  category: 3,
  tags: [5, 8],
  featured_image_alt: '',
  post_type: 'article',
  allow_comments: true,
  meta_title: '',
  meta_description: '',
}

const authorPostBlock: AuthorPostBlock = {
  id: 41,
  block_type: 'rich_text',
  position: 0,
  content: '<p>A saved section.</p>',
  image: null,
  image_alt: '',
  caption: '',
  image_width: 'content',
  video_url: '',
  quote_attribution: '',
  created_at: '2026-07-30T10:00:00Z',
  updated_at: '2026-07-30T10:15:00Z',
}

const authorPostBlockInput: AuthorPostBlockInput = {
  block_type: 'rich_text',
  position: 0,
  content: '<p>A saved section.</p>',
  image: null,
  image_alt: '',
  caption: '',
  image_width: 'content',
  video_url: '',
  quote_attribution: '',
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

  it('loads one author post for editing', async () => {
    apiRequestMock.mockResolvedValue(authorPostDetail)

    await expect(getAuthorPost(20)).resolves.toEqual(
      authorPostDetail,
    )
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/',
    )
  })

  it('creates a draft with JSON input', async () => {
    apiRequestMock.mockResolvedValue(authorPostDetail)

    await expect(
      createAuthorPost(authorPostInput),
    ).resolves.toEqual(authorPostDetail)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/',
      {
        method: 'POST',
        body: JSON.stringify(authorPostInput),
      },
    )
  })

  it('updates an existing author post', async () => {
    apiRequestMock.mockResolvedValue(authorPostDetail)

    await expect(
      updateAuthorPost(20, authorPostInput),
    ).resolves.toEqual(authorPostDetail)
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/',
      {
        method: 'PUT',
        body: JSON.stringify(authorPostInput),
      },
    )
  })

  it('deletes an author post', async () => {
    apiRequestMock.mockResolvedValue(null)

    await expect(deleteAuthorPost(20)).resolves.toBeNull()
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/',
      { method: 'DELETE' },
    )
  })

  it('publishes an author post immediately', async () => {
    apiRequestMock.mockResolvedValue({
      ...authorPostDetail,
      status: 'published',
    })

    await publishAuthorPost(20)

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/publish/',
      { method: 'POST' },
    )
  })

  it('loads unpaginated category and tag choices', async () => {
    const categories = [publishedPost.category]
    const tags = publishedPost.tags
    apiRequestMock
      .mockResolvedValueOnce(categories)
      .mockResolvedValueOnce(tags)

    await expect(getCategories()).resolves.toEqual(categories)
    await expect(getTags()).resolves.toEqual(tags)
    expect(apiRequestMock).toHaveBeenNthCalledWith(
      1,
      '/api/categories/',
    )
    expect(apiRequestMock).toHaveBeenNthCalledWith(
      2,
      '/api/tags/',
    )
  })

  it('loads ordered blocks for one author post', async () => {
    apiRequestMock.mockResolvedValue([authorPostBlock])

    await expect(getAuthorPostBlocks(20)).resolves.toEqual([
      authorPostBlock,
    ])
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/blocks/',
    )
  })

  it('creates a block with multipart data', async () => {
    apiRequestMock.mockResolvedValue(authorPostBlock)

    await createAuthorPostBlock(20, authorPostBlockInput)

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/blocks/',
      expect.objectContaining({ method: 'POST' }),
    )
    const options = apiRequestMock.mock.calls[0]?.[1]
    const body = options?.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('block_type')).toBe('rich_text')
    expect(body.get('position')).toBe('0')
    expect(body.get('content')).toBe('<p>A saved section.</p>')
    expect(body.has('image')).toBe(false)
  })

  it('includes a selected image file in block data', async () => {
    const image = new File(['image'], 'diagram.png', {
      type: 'image/png',
    })
    apiRequestMock.mockResolvedValue({
      ...authorPostBlock,
      block_type: 'image',
    })

    await createAuthorPostBlock(20, {
      ...authorPostBlockInput,
      block_type: 'image',
      image,
      image_alt: 'System diagram',
      caption: 'Request flow',
      image_width: 'wide',
    })

    const options = apiRequestMock.mock.calls[0]?.[1]
    const body = options?.body as FormData
    expect(body.get('image')).toBe(image)
    expect(body.get('image_alt')).toBe('System diagram')
    expect(body.get('caption')).toBe('Request flow')
    expect(body.get('image_width')).toBe('wide')
  })

  it('updates and deletes an existing post block', async () => {
    apiRequestMock
      .mockResolvedValueOnce(authorPostBlock)
      .mockResolvedValueOnce(null)

    await updateAuthorPostBlock(20, 41, authorPostBlockInput)
    await deleteAuthorPostBlock(20, 41)

    expect(apiRequestMock).toHaveBeenNthCalledWith(
      1,
      '/api/dashboard/posts/20/blocks/41/',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(apiRequestMock).toHaveBeenNthCalledWith(
      2,
      '/api/dashboard/posts/20/blocks/41/',
      { method: 'DELETE' },
    )
  })

  it('sends the complete block order atomically', async () => {
    apiRequestMock.mockResolvedValue([authorPostBlock])

    await reorderAuthorPostBlocks(20, [44, 41])

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/dashboard/posts/20/blocks/reorder/',
      {
        method: 'PUT',
        body: JSON.stringify({ block_ids: [44, 41] }),
      },
    )
  })
})
