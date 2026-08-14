import {apiRequest} from './client'
import type {PublicPostListItem} from './posts'

export interface SavedPostRecord {
    id: number
    post: PublicPostListItem
    saved_at: string
}

export function getSavedPosts(): Promise<SavedPostRecord[]> {
    return apiRequest<SavedPostRecord[]>('/api/saved-posts/')
}

export function savePost(slug: string): Promise<SavedPostRecord> {
    return apiRequest<SavedPostRecord>('/api/saved-posts/', {
        method: 'POST',
        body: JSON.stringify({post_slug: slug}),
    })
}

export function removeSavedPost(slug: string): Promise<null> {
    return apiRequest<null>(
        `/api/saved-posts/${encodeURIComponent(slug)}/`,
        {method: 'DELETE'},
    )
}
