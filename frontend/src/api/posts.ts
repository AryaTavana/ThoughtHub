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
    | 'in_review'
    | 'scheduled'
    | 'published'
    | 'rejected'
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
}

export function getPublishedPosts(
    parameters: PublishedPostListParameters = {},
): Promise<PaginatedResponse<PublicPostListItem>> {
    const searchParameters = new URLSearchParams()

    if (parameters.page !== undefined) {
        searchParameters.set('page', String(parameters.page))
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
