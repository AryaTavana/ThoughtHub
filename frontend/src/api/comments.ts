import {apiRequest} from './client'
import type {PaginatedResponse} from './pagination'
import type {PostStatus} from './posts'

export interface PublicComment {
    id: number
    author_username: string
    content: string
    created_at: string
}

export interface SubmittedComment
    extends PublicComment {
    status: 'approved'
    moderation_feedback: string
}

export interface AuthorCommentListItem {
    id: number
    post_title: string
    post_slug: string
    post_status: PostStatus
    content: string
    status: 'approved' | 'removed'
    moderation_feedback: string
    created_at: string
    updated_at: string
}

export interface CommentSubmission {
    content: string
}

export interface CommentListParameters {
    page?: number
}

function getCommentEndpoint(slug: string): string {
    const encodedSlug = encodeURIComponent(slug)

    return `/api/posts/${encodedSlug}/comments/`
}

export function getPostComments(
    slug: string,
    parameters: CommentListParameters = {},
): Promise<PaginatedResponse<PublicComment>> {
    const searchParameters = new URLSearchParams()

    if (parameters.page !== undefined) {
        searchParameters.set(
            'page',
            String(parameters.page),
        )
    }

    const queryString = searchParameters.toString()
    const endpoint = getCommentEndpoint(slug)
    const path = queryString
        ? `${endpoint}?${queryString}`
        : endpoint

    return apiRequest<PaginatedResponse<PublicComment>>(
        path,
    )
}

export function submitPostComment(
    slug: string,
    submission: CommentSubmission,
): Promise<SubmittedComment> {
    return apiRequest<SubmittedComment>(
        getCommentEndpoint(slug),
        {
            method: 'POST',
            body: JSON.stringify(submission),
        },
    )
}

export function getAuthorComments(
    parameters: CommentListParameters = {},
): Promise<PaginatedResponse<AuthorCommentListItem>> {
    const searchParameters = new URLSearchParams()

    if (parameters.page !== undefined) {
        searchParameters.set(
            'page',
            String(parameters.page),
        )
    }

    const queryString = searchParameters.toString()
    const path = queryString
        ? `/api/dashboard/comments/?${queryString}`
        : '/api/dashboard/comments/'

    return apiRequest<
        PaginatedResponse<AuthorCommentListItem>
    >(path)
}
