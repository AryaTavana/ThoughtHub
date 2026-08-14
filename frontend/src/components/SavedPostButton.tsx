import {Icon} from '@iconify/react'
import bookmarkIcon from '@iconify-icons/lucide/bookmark'
import bookmarkCheckIcon from '@iconify-icons/lucide/bookmark-check'
import {useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {useSavedPosts} from '../useSavedPosts'

interface SaveablePost {
    slug: string
    title: string
    excerpt: string
    author: string
    category: string
    readingTime: number
}

interface SavedPostButtonProps {
    post: SaveablePost
}

export function SavedPostButton({post}: SavedPostButtonProps) {
    const {
        isAuthenticated,
        savedSlugs,
        pendingSlugs,
        toggleSavedPost,
    } = useSavedPosts()
    const navigate = useNavigate()
    const location = useLocation()
    const [actionError, setActionError] = useState<string | null>(null)
    const isSaved = savedSlugs.has(post.slug)
    const isPending = pendingSlugs.has(post.slug)

    async function handleClick() {
        if (!isAuthenticated) {
            const requestedPath = `${location.pathname}${location.search}${location.hash}`
            navigate('/login', {state: {from: requestedPath}})
            return
        }

        setActionError(null)
        try {
            await toggleSavedPost(post.slug)
        } catch (error) {
            setActionError(
                getApiErrorMessage(
                    error,
                    'Unable to update this saved post.',
                ),
            )
        }
    }

    return (
        <>
            <button
                className="post-save-button"
                type="button"
                aria-pressed={isSaved}
                aria-label={isSaved ? `Remove ${post.title} from saved posts` : `Save ${post.title}`}
                disabled={isPending}
                onClick={() => void handleClick()}
            >
                <Icon icon={isSaved ? bookmarkCheckIcon : bookmarkIcon} aria-hidden="true"/>
                <span>
                    {isPending ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
                </span>
            </button>

            {actionError && (
                <span className="visually-hidden" role="alert">
                    {actionError}
                </span>
            )}
        </>
    )
}
