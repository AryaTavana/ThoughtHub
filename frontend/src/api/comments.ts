import {apiRequest} from './client'
import type {PaginatedResponse} from './pagination'

export interface PublicComment {
    id: number
    author_username: string
    content: string
    created_at: string
}

export interface SubmittedComment
    extends PublicComment {
    status: 'pending'
    moderation_feedback: string
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
