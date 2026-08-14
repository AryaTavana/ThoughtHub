import {createContext} from 'react'

import type {SavedPostRecord} from './api/savedPosts'

export interface SavedPostsContextValue {
    isAuthenticated: boolean
    savedPosts: SavedPostRecord[]
    savedSlugs: ReadonlySet<string>
    pendingSlugs: ReadonlySet<string>
    isLoading: boolean
    error: string | null
    toggleSavedPost: (slug: string) => Promise<void>
    refreshSavedPosts: () => Promise<void>
}

export const SavedPostsContext = createContext<SavedPostsContextValue>({
    isAuthenticated: false,
    savedPosts: [],
    savedSlugs: new Set(),
    pendingSlugs: new Set(),
    isLoading: false,
    error: null,
    toggleSavedPost: async () => {},
    refreshSavedPosts: async () => {},
})
