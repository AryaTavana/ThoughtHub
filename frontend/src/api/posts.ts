import {apiRequest} from './client'
import type {PaginatedResponse} from './pagination'

export type {PaginatedResponse} from './pagination'

export type PostType =
    | 'article'
    | 'news'
    | 'tutorial'
    | 'opinion'

export type PostStatus =
    | 'draft'
    | 'published'
    | 'removed'
    | 'archived'

export type PostBlockType =
    | 'rich_text'
    | 'image'
    | 'video'
    | 'quote'
    | 'divider'

export type ImageWidth =
    | 'content'
    | 'wide'
    | 'full'

export interface Category {
    id: number
    name: string
    slug: string
}

export interface Tag {
    id: number
    name: string
    slug: string
}

export interface PublicPostListItem {
    id: number
    title: string
    slug: string
    excerpt: string
    author_username: string | null
    category: Category | null
    tags: Tag[]
    featured_image: string | null
    featured_image_alt: string
    post_type: PostType
    published_at: string
    reading_time: number
}

export type AuthorPostListItem =
    Omit<PublicPostListItem, 'published_at'> & {
        status: PostStatus
        review_feedback: string
        published_at: string | null
        date_posted: string
        updated_at: string
    }

export interface AuthorPostDetail {
    id: number
    title: string
    slug: string
    excerpt: string
    content: string
    category: number | null
    tags: number[]
    featured_image: string | null
    featured_image_alt: string
    post_type: PostType
    allow_comments: boolean
    meta_title: string
    meta_description: string
    status: PostStatus
    review_feedback: string
    published_at: string | null
    date_posted: string
    updated_at: string
}

export interface AuthorPostInput {
    title: string
    excerpt: string
    content: string
    category: number | null
    tags: number[]
    featured_image_alt: string
    post_type: PostType
    allow_comments: boolean
    meta_title: string
    meta_description: string
}

export interface PublicPostBlock {
    id: number
    block_type: PostBlockType
    position: number
    content: string
    image: string | null
    image_alt: string
    caption: string
    image_width: ImageWidth
    video_url: string
    quote_attribution: string
}

export interface AuthorPostBlock extends PublicPostBlock {
    created_at: string
    updated_at: string
}

export interface AuthorPostBlockInput {
    block_type: PostBlockType
    position: number
    content: string
    image?: File | null
    image_alt: string
    caption: string
    image_width: ImageWidth
    video_url: string
    quote_attribution: string
}

export interface PublicPostDetail
    extends PublicPostListItem {
    content: string
    blocks: PublicPostBlock[]
    allow_comments: boolean
    meta_title: string
    meta_description: string
    updated_at: string
}

export interface PublishedPostListParameters {
    page?: number
    search?: string
}

export function getPublishedPosts(
    parameters: PublishedPostListParameters = {},
): Promise<PaginatedResponse<PublicPostListItem>> {
    const searchParameters = new URLSearchParams()

    if (parameters.page !== undefined) {
        searchParameters.set('page', String(parameters.page))
    }

    if (parameters.search?.trim()) {
        searchParameters.set('search', parameters.search.trim())
    }

    const queryString = searchParameters.toString()
    const path = queryString
        ? `/api/posts/?${queryString}`
        : '/api/posts/'

    return apiRequest<PaginatedResponse<PublicPostListItem>>(path)
}

export function getPublishedPost(
    slug: string,
): Promise<PublicPostDetail> {
    const encodedSlug = encodeURIComponent(slug)

    return apiRequest<PublicPostDetail>(
        `/api/posts/${encodedSlug}/`,
    )
}

export interface AuthorPostListParameters {
    page?: number
}

export function getAuthorPosts(
    parameters: AuthorPostListParameters = {},
): Promise<PaginatedResponse<AuthorPostListItem>> {
    const searchParameters = new URLSearchParams()

    if (parameters.page !== undefined) {
        searchParameters.set('page', String(parameters.page))
    }

    const queryString = searchParameters.toString()
    const path = queryString
        ? `/api/dashboard/posts/?${queryString}`
        : '/api/dashboard/posts/'

    return apiRequest<PaginatedResponse<AuthorPostListItem>>(
        path,
    )
}

export function getAuthorPost(
    postId: number,
): Promise<AuthorPostDetail> {
    return apiRequest<AuthorPostDetail>(
        `/api/dashboard/posts/${postId}/`,
    )
}

export function createAuthorPost(
    input: AuthorPostInput,
): Promise<AuthorPostDetail> {
    return apiRequest<AuthorPostDetail>(
        '/api/dashboard/posts/',
        {
            method: 'POST',
            body: JSON.stringify(input),
        },
    )
}

export function updateAuthorPost(
    postId: number,
    input: AuthorPostInput,
): Promise<AuthorPostDetail> {
    return apiRequest<AuthorPostDetail>(
        `/api/dashboard/posts/${postId}/`,
        {
            method: 'PUT',
            body: JSON.stringify(input),
        },
    )
}

export function deleteAuthorPost(postId: number): Promise<null> {
    return apiRequest<null>(
        `/api/dashboard/posts/${postId}/`,
        {method: 'DELETE'},
    )
}

export function publishAuthorPost(
    postId: number,
): Promise<AuthorPostDetail> {
    return apiRequest<AuthorPostDetail>(
        `/api/dashboard/posts/${postId}/publish/`,
        {method: 'POST'},
    )
}

export function getCategories(): Promise<Category[]> {
    return apiRequest<Category[]>('/api/categories/')
}

export function getTags(): Promise<Tag[]> {
    return apiRequest<Tag[]>('/api/tags/')
}

function createPostBlockFormData(
    input: AuthorPostBlockInput,
): FormData {
    const formData = new FormData()

    formData.set('block_type', input.block_type)
    formData.set('position', String(input.position))
    formData.set('content', input.content)
    formData.set('image_alt', input.image_alt)
    formData.set('caption', input.caption)
    formData.set('image_width', input.image_width)
    formData.set('video_url', input.video_url)
    formData.set(
        'quote_attribution',
        input.quote_attribution,
    )

    if (input.image) {
        formData.set('image', input.image)
    }

    return formData
}

export function getAuthorPostBlocks(
    postId: number,
): Promise<AuthorPostBlock[]> {
    return apiRequest<AuthorPostBlock[]>(
        `/api/dashboard/posts/${postId}/blocks/`,
    )
}

export function createAuthorPostBlock(
    postId: number,
    input: AuthorPostBlockInput,
): Promise<AuthorPostBlock> {
    return apiRequest<AuthorPostBlock>(
        `/api/dashboard/posts/${postId}/blocks/`,
        {
            method: 'POST',
            body: createPostBlockFormData(input),
        },
    )
}

export function updateAuthorPostBlock(
    postId: number,
    blockId: number,
    input: AuthorPostBlockInput,
): Promise<AuthorPostBlock> {
    return apiRequest<AuthorPostBlock>(
        `/api/dashboard/posts/${postId}/blocks/${blockId}/`,
        {
            method: 'PATCH',
            body: createPostBlockFormData(input),
        },
    )
}

export function deleteAuthorPostBlock(
    postId: number,
    blockId: number,
): Promise<null> {
    return apiRequest<null>(
        `/api/dashboard/posts/${postId}/blocks/${blockId}/`,
        {method: 'DELETE'},
    )
}

export function reorderAuthorPostBlocks(
    postId: number,
    blockIds: number[],
): Promise<AuthorPostBlock[]> {
    return apiRequest<AuthorPostBlock[]>(
        `/api/dashboard/posts/${postId}/blocks/reorder/`,
        {
            method: 'PUT',
            body: JSON.stringify({block_ids: blockIds}),
        },
    )
}
