import {
    useEffect,
    useState,
} from 'react'
import {Link} from 'react-router-dom'

import {
    getAuthorComments,
    type AuthorCommentListItem,
} from '../api/comments'
import {getApiErrorMessage} from '../api/errors'
import type {PaginatedResponse} from '../api/pagination'

const commentDateFormatter = new Intl.DateTimeFormat(
    undefined,
    {dateStyle: 'medium'},
)

function formatCommentDate(value: string): string {
    const date = new Date(value)

    return Number.isNaN(date.getTime())
        ? value
        : commentDateFormatter.format(date)
}

export function AuthorCommentsPanel() {
    const [commentsPage, setCommentsPage] =
        useState<PaginatedResponse<AuthorCommentListItem> | null>(
            null,
        )
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] =
        useState<string | null>(null)

    useEffect(() => {
        let isCancelled = false

        async function loadComments() {
            setIsLoading(true)
            setLoadError(null)

            try {
                const response = await getAuthorComments({page})

                if (!isCancelled) {
                    setCommentsPage(response)
                }
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(
                        getApiErrorMessage(
                            error,
                            'Unable to load your comments.',
                        ),
                    )
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadComments()

        return () => {
            isCancelled = true
        }
    }, [page, reloadKey])

    return (
        <section
            className="mt-5 pt-5 border-top"
            aria-labelledby="author-comments-heading"
        >
            <header className="mb-4">
                <h2 id="author-comments-heading">
                    Your comments
                </h2>
                <p className="text-secondary mb-0">
                    Track your published comments and any moderation
                    feedback.
                </p>
            </header>

            {isLoading && (
                <p role="status">Loading your comments…</p>
            )}

            {!isLoading && loadError && (
                <div className="alert alert-danger" role="alert">
                    <p>{loadError}</p>
                    <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={() => {
                            setReloadKey((current) => current + 1)
                        }}
                    >
                        Try loading comments again
                    </button>
                </div>
            )}

            {!isLoading &&
                !loadError &&
                commentsPage?.results.length === 0 && (
                    <p className="text-secondary mb-0">
                        You have not published any comments yet.
                    </p>
                )}

            {!isLoading &&
                !loadError &&
                commentsPage &&
                commentsPage.results.length > 0 && (
                    <>
                        <div className="list-group">
                            {commentsPage.results.map((comment) => (
                                <article
                                    className="list-group-item py-4"
                                    key={comment.id}
                                >
                                    <div className="d-flex flex-wrap justify-content-between gap-2">
                                        <h3 className="h6 mb-0">
                                            {comment.post_status ===
                                            'published' ? (
                                                <Link
                                                    to={`/posts/${comment.post_slug}`}
                                                >
                                                    {comment.post_title}
                                                </Link>
                                            ) : (
                                                comment.post_title
                                            )}
                                        </h3>
                                        <span className="badge text-bg-secondary text-capitalize">
                                            {comment.status}
                                        </span>
                                    </div>

                                    <p
                                        className="my-3"
                                        style={{whiteSpace: 'pre-wrap'}}
                                    >
                                        {comment.content}
                                    </p>

                                    <p className="small text-secondary mb-0">
                                        Published{' '}
                                        {formatCommentDate(
                                            comment.created_at,
                                        )}
                                    </p>

                                    {comment.moderation_feedback && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <strong>
                                                Moderation feedback:
                                            </strong>{' '}
                                            {
                                                comment.moderation_feedback
                                            }
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>

                        {(commentsPage.previous ||
                            commentsPage.next) && (
                            <nav
                                className="d-flex justify-content-center align-items-center gap-3 mt-4"
                                aria-label="Dashboard comment pages"
                            >
                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    disabled={
                                        commentsPage.previous === null
                                    }
                                    onClick={() => {
                                        setPage((currentPage) =>
                                            Math.max(
                                                1,
                                                currentPage - 1,
                                            ),
                                        )
                                    }}
                                >
                                    Previous comments
                                </button>
                                <span aria-live="polite">
                                    Comment page {page}
                                </span>
                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    disabled={commentsPage.next === null}
                                    onClick={() => {
                                        setPage(
                                            (currentPage) =>
                                                currentPage + 1,
                                        )
                                    }}
                                >
                                    Next comments
                                </button>
                            </nav>
                        )}
                    </>
                )}
        </section>
    )
}
