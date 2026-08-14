import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'

import {getApiErrorMessage} from './api/errors'
import {
    getSavedPosts,
    removeSavedPost,
    savePost,
    type SavedPostRecord,
} from './api/savedPosts'
import {useAuth} from './auth/useAuth'
import {
    SavedPostsContext,
    type SavedPostsContextValue,
} from './saved-posts-context'

interface SavedPostsProviderProps {
    children: ReactNode
}

export function SavedPostsProvider({children}: SavedPostsProviderProps) {
    const {isAuthenticated, isInitializing, user} = useAuth()
    const [savedPosts, setSavedPosts] = useState<SavedPostRecord[]>([])
    const [pendingSlugs, setPendingSlugs] = useState<Set<string>>(
        () => new Set(),
    )
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refreshSavedPosts = useCallback(async () => {
        if (!isAuthenticated) {
            setSavedPosts([])
            setError(null)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            setSavedPosts(await getSavedPosts())
        } catch (loadError) {
            setError(
                getApiErrorMessage(
                    loadError,
                    'Unable to load your saved posts.',
                ),
            )
        } finally {
            setIsLoading(false)
        }
    }, [isAuthenticated])

    useEffect(() => {
        if (isInitializing) {
            return
        }

        let cancelled = false

        async function loadSavedPosts() {
            if (!isAuthenticated) {
                if (!cancelled) {
                    setSavedPosts([])
                    setError(null)
                }
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const response = await getSavedPosts()
                if (!cancelled) {
                    setSavedPosts(response)
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        getApiErrorMessage(
                            loadError,
                            'Unable to load your saved posts.',
                        ),
                    )
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadSavedPosts()

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, isInitializing, user?.id])

    const savedSlugs = useMemo(
        () => new Set(savedPosts.map((item) => item.post.slug)),
        [savedPosts],
    )

    async function toggleSavedPost(slug: string) {
        if (!isAuthenticated || pendingSlugs.has(slug)) {
            return
        }

        const isSaved = savedSlugs.has(slug)
        setError(null)
        setPendingSlugs((current) => new Set(current).add(slug))

        try {
            if (isSaved) {
                await removeSavedPost(slug)
                setSavedPosts((current) =>
                    current.filter((item) => item.post.slug !== slug),
                )
            } else {
                const savedPost = await savePost(slug)
                setSavedPosts((current) => [
                    savedPost,
                    ...current.filter(
                        (item) => item.post.slug !== slug,
                    ),
                ])
            }
        } catch (saveError) {
            const message = getApiErrorMessage(
                saveError,
                'Unable to update your saved posts.',
            )
            setError(message)
            throw saveError
        } finally {
            setPendingSlugs((current) => {
                const next = new Set(current)
                next.delete(slug)
                return next
            })
        }
    }

    const contextValue: SavedPostsContextValue = {
        isAuthenticated,
        savedPosts,
        savedSlugs,
        pendingSlugs,
        isLoading,
        error,
        toggleSavedPost,
        refreshSavedPosts,
    }

    return (
        <SavedPostsContext.Provider value={contextValue}>
            {children}
        </SavedPostsContext.Provider>
    )
}
