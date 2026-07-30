import {apiRequest} from './client'

export type PostType =
    | 'article'
    | 'news'
    | 'tutorial'
    | 'opinion'

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

export interface PaginatedResponse<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
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
