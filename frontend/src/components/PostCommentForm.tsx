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
import {
    getApiErrorMessage,
    getApiFieldErrors,
} from '../api/errors'
import {useAuth} from '../auth/useAuth'

interface PostCommentFormProps {
    slug: string
    allowComments: boolean
}

interface OpenPostCommentFormProps {
    slug: string
}

function AuthenticatedPostCommentForm({
    slug,
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
            await submitPostComment(slug, {content})
            setContent('')
            setConfirmation(
                'Your comment was submitted and is waiting for moderation.',
            )
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
        <div className="card mb-4">
            <div className="card-body">
                <h3 className="h5 card-title">
                    Leave a comment
                </h3>

                <p className="text-secondary">
                    Comments are reviewed before they become
                    public.
                </p>

                {confirmation && (
                    <div
                        className="alert alert-success"
                        role="status"
                    >
                        {confirmation}
                    </div>
                )}

                {submitError && (
                    <div
                        className="alert alert-danger"
                        role="alert"
                    >
                        {submitError}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    aria-busy={isSubmitting}
                >
                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor="comment-content"
                        >
                            Comment
                        </label>

                        <textarea
                            id="comment-content"
                            name="content"
                            className={`form-control ${
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
                            className="form-text"
                            id="comment-content-count"
                        >
                            {content.length}/2000 characters
                        </div>

                        {contentError && (
                            <div
                                className="invalid-feedback d-block"
                                id="comment-content-error"
                            >
                                {contentError}
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? 'Submitting…'
                            : 'Submit comment'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function OpenPostCommentForm({
    slug,
}: OpenPostCommentFormProps) {
    const {
        isAuthenticated,
        isInitializing,
    } = useAuth()
    const location = useLocation()

    if (isInitializing) {
        return (
            <div
                className="alert alert-secondary"
                role="status"
            >
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
            <div className="alert alert-info">
                <p className="mb-2">
                    Log in to join the conversation.
                </p>

                <Link
                    className="btn btn-outline-primary btn-sm"
                    to="/login"
                    state={{from: requestedPath}}
                >
                    Log in to comment
                </Link>
            </div>
        )
    }

    return <AuthenticatedPostCommentForm slug={slug}/>
}

export function PostCommentForm({
    slug,
    allowComments,
}: PostCommentFormProps) {
    if (!allowComments) {
        return (
            <div
                className="alert alert-secondary"
                role="status"
            >
                Comments are closed for this post.
            </div>
        )
    }

    return <OpenPostCommentForm slug={slug}/>
}
