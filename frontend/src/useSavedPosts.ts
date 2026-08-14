import {useContext} from 'react'

import {SavedPostsContext} from './saved-posts-context'

export function useSavedPosts() {
    return useContext(SavedPostsContext)
}
