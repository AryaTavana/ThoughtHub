import {Icon} from '@iconify/react'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import lockIcon from '@iconify-icons/lucide/lock-keyhole'
import messageIcon from '@iconify-icons/lucide/message-circle'
import sendIcon from '@iconify-icons/lucide/send'
import {
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import {
    Link,
    useLocation,
} from 'react-router-dom'

import {submitPostComment} from '../api/comments'
import type {SubmittedComment} from '../api/comments'
import {
    getApiErrorMessage,
    getApiFieldErrors,
} from '../api/errors'
import {useAuth} from '../auth/useAuth'

interface PostCommentFormProps {
    slug: string
    allowComments: boolean
    onCommentPublished?: (comment: SubmittedComment) => void
}

interface OpenPostCommentFormProps {
    slug: string
    onCommentPublished?: (comment: SubmittedComment) => void
}

function AuthenticatedPostCommentForm({
    slug,
    onCommentPublished,
}: OpenPostCommentFormProps) {
    const [content, setContent] = useState('')
    const [contentError, setContentError] =
        useState<string | null>(null)
    const [submitError, setSubmitError] =
        useState<string | null>(null)
    const [confirmation, setConfirmation] =
        useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    function handleChange(
        event: ChangeEvent<HTMLTextAreaElement>,
    ) {
        setContent(event.target.value)
        setContentError(null)
        setSubmitError(null)
        setConfirmation(null)
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()
        setContentError(null)
        setSubmitError(null)
        setConfirmation(null)

        if (!content.trim()) {
            setContentError(
                'Comment content cannot be empty.',
            )
            return
        }

        setIsSubmitting(true)

        try {
            const publishedComment = await submitPostComment(
                slug,
                {content},
            )
            setContent('')
            setConfirmation('Your comment is now published.')
            onCommentPublished?.(publishedComment)
        } catch (error) {
            const fieldErrors = getApiFieldErrors(error)
            const apiContentError =
                fieldErrors.content?.[0]

            if (apiContentError) {
                setContentError(apiContentError)
            } else {
                setSubmitError(
                    getApiErrorMessage(
                        error,
                        'Unable to submit your comment.',
                    ),
                )
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const contentDescription = contentError
        ? 'comment-content-count comment-content-error'
        : 'comment-content-count'

    return (
        <div className="comment-composer">
            <div className="comment-composer__heading">
                <div aria-hidden="true"><Icon icon={messageIcon}/></div>
                <div><h3>Leave a comment</h3><p>Share a useful response with the author and other students.</p></div>
                <span>Publishes immediately</span>
            </div>

                {confirmation && (
                    <div
                        className="app-alert app-alert--success"
                        role="status"
                    >
                        {confirmation}
                    </div>
                )}

                {submitError && (
                    <div
                        className="app-alert app-alert--danger"
                        role="alert"
                    >
                        {submitError}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    aria-busy={isSubmitting}
                >
                    <div className="comment-composer__field">
                        <label
                            htmlFor="comment-content"
                        >
                            Comment
                        </label>

                        <textarea
                            id="comment-content"
                            name="content"
                            className={`comment-composer__textarea ${
                                contentError
                                    ? 'is-invalid'
                                    : ''
                            }`}
                            rows={5}
                            maxLength={2000}
                            required
                            disabled={isSubmitting}
                            value={content}
                            aria-invalid={Boolean(
                                contentError,
                            )}
                            aria-describedby={
                                contentDescription
                            }
                            onChange={handleChange}
                        />

                        <div
                            className="comment-composer__count"
                            id="comment-content-count"
                        >
                            {content.length}/2000 characters
                        </div>

                        {contentError && (
                            <div
                                className="field-error"
                                id="comment-content-error"
                            >
                                {contentError}
                            </div>
                        )}
                    </div>

                    <button
                        className="button button--primary"
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Publishing…' : 'Publish comment'}
                        {!isSubmitting && <Icon icon={sendIcon} aria-hidden="true"/>}
                    </button>
                </form>
        </div>
    )
}

function OpenPostCommentForm({
    slug,
    onCommentPublished,
}: OpenPostCommentFormProps) {
    const {
        isAuthenticated,
        isInitializing,
    } = useAuth()
    const location = useLocation()

    if (isInitializing) {
        return (
            <div
                className="comment-access-card"
                role="status"
            >
                <span className="loading-ring" aria-hidden="true"/>
                Checking whether you can comment…
            </div>
        )
    }

    if (!isAuthenticated) {
        const requestedPath =
            `${location.pathname}` +
            `${location.search}` +
            `${location.hash}`

        return (
            <div className="comment-access-card">
                <div className="comment-access-card__icon" aria-hidden="true"><Icon icon={lockIcon}/></div>
                <div><strong>Join the conversation</strong><p>Log in to join the conversation.</p><small>Your response will publish immediately.</small></div>

                <Link
                    className="button button--secondary button--small"
                    to="/login"
                    state={{from: requestedPath}}
                >
                    Log in to comment <Icon icon={arrowRightIcon} aria-hidden="true"/>
                </Link>
            </div>
        )
    }

    return (
        <AuthenticatedPostCommentForm
            slug={slug}
            onCommentPublished={onCommentPublished}
        />
    )
}

export function PostCommentForm({
    slug,
    allowComments,
    onCommentPublished,
}: PostCommentFormProps) {
    if (!allowComments) {
        return (
            <div
                className="comment-access-card"
                role="status"
            >
                <div className="comment-access-card__icon" aria-hidden="true"><Icon icon={lockIcon}/></div>
                <div><strong>Comments are closed</strong><p>The author is not accepting new responses on this post.</p></div>
                <span className="visually-hidden">Comments are closed for this post.</span>
            </div>
        )
    }

    return (
        <OpenPostCommentForm
            slug={slug}
            onCommentPublished={onCommentPublished}
        />
    )
}
