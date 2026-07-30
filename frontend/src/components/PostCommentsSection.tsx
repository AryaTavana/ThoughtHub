import {
    useEffect,
    useState,
} from 'react'

import {
    getPostComments,
    type PublicComment,
} from '../api/comments'
import {getApiErrorMessage} from '../api/errors'
import type {PaginatedResponse} from '../api/pagination'
import {PostCommentForm} from './PostCommentForm'

interface PostCommentsSectionProps {
    slug: string
    allowComments: boolean
}

const commentDateFormatter = new Intl.DateTimeFormat(
    undefined,
    {
        dateStyle: 'medium',
        timeStyle: 'short',
    },
)

function formatCommentDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return commentDateFormatter.format(date)
}

export function PostCommentsSection({
    slug,
    allowComments,
}: PostCommentsSectionProps) {
    const [commentsPage, setCommentsPage] =
        useState<PaginatedResponse<PublicComment> | null>(null)
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] =
        useState<string | null>(null)

    useEffect(() => {
        let isCancelled = false

        async function loadComments() {
            setCommentsPage(null)
            setIsLoading(true)
            setLoadError(null)

            try {
                const response = await getPostComments(
                    slug,
                    {page},
                )

                if (!isCancelled) {
                    setCommentsPage(response)
                }
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(
                        getApiErrorMessage(
                            error,
                            'Unable to load comments.',
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
    }, [slug, page, reloadKey])

    return (
        <section
            className="col-lg-8 mx-auto mt-5 pt-4 border-top"
            aria-labelledby="post-comments-heading"
        >
            <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
                <h2
                    className="h3 mb-0"
                    id="post-comments-heading"
                >
                    Comments
                </h2>

                {commentsPage && (
                    <span className="text-secondary">
                        {commentsPage.count}{' '}
                        {commentsPage.count === 1
                            ? 'comment'
                            : 'comments'}
                    </span>
                )}
            </div>

            <PostCommentForm
                slug={slug}
                allowComments={allowComments}
            />

            {isLoading && (
                <div
                    className="text-center py-4"
                    role="status"
                >
                    <div
                        className="spinner-border spinner-border-sm text-primary me-2"
                        aria-hidden="true"
                    />
                    Loading comments…
                </div>
            )}

            {!isLoading && loadError && (
                <div className="alert alert-danger" role="alert">
                    <p className="mb-3">{loadError}</p>

                    <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={() => {
                            setReloadKey(
                                (currentKey) => currentKey + 1,
                            )
                        }}
                    >
                        Try loading comments again
                    </button>
                </div>
            )}

            {!isLoading &&
                !loadError &&
                commentsPage?.results.length === 0 && (
                    <p className="text-secondary">
                        No approved comments yet.
                    </p>
                )}

            {!isLoading &&
                !loadError &&
                commentsPage &&
                commentsPage.results.length > 0 && (
                    <>
                        <ol className="list-unstyled d-grid gap-3 mb-0">
                            {commentsPage.results.map(
                                (comment) => (
                                    <li key={comment.id}>
                                        <article className="card">
                                            <div className="card-body">
                                                <header className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                                                    <h3 className="h6 mb-0">
                                                        {
                                                            comment.author_username
                                                        }
                                                    </h3>

                                                    <time
                                                        className="small text-secondary"
                                                        dateTime={
                                                            comment.created_at
                                                        }
                                                    >
                                                        {formatCommentDate(
                                                            comment.created_at,
                                                        )}
                                                    </time>
                                                </header>

                                                <p
                                                    className="mb-0"
                                                    style={{
                                                        whiteSpace:
                                                            'pre-wrap',
                                                    }}
                                                >
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </article>
                                    </li>
                                ),
                            )}
                        </ol>

                        {(commentsPage.previous ||
                            commentsPage.next) && (
                            <nav
                                className="d-flex justify-content-center align-items-center gap-3 mt-4"
                                aria-label="Comment pages"
                            >
                                <button
                                    className="btn btn-outline-primary btn-sm"
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

                                <span
                                    className="small"
                                    aria-live="polite"
                                >
                                    Page {page}
                                </span>

                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    type="button"
                                    disabled={
                                        commentsPage.next === null
                                    }
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
