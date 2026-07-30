import {
    useEffect,
    useState,
} from 'react'
import {Link} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {
    getAuthorPosts,
    type AuthorPostListItem,
    type PaginatedResponse,
} from '../api/posts'

const updatedDateFormatter = new Intl.DateTimeFormat(
    undefined,
    {
        dateStyle: 'medium',
    },
)

function formatUpdatedDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return updatedDateFormatter.format(date)
}

export function DashboardPage() {
    const [postsPage, setPostsPage] =
        useState<PaginatedResponse<AuthorPostListItem> | null>(
            null,
        )
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] =
        useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [page, setPage] = useState(1)

    useEffect(() => {
        let isCancelled = false

        async function loadPosts() {
            setIsLoading(true)
            setLoadError(null)

            try {
                const response = await getAuthorPosts({page})

                if (!isCancelled) {
                    setPostsPage(response)
                }
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(
                        getApiErrorMessage(
                            error,
                            'Unable to load your posts.',
                        ),
                    )
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadPosts()

        return () => {
            isCancelled = true
        }
    }, [page, reloadKey])

    return (
        <section className="container py-5">
            <header className="mb-5">
                <h1>Your posts</h1>
                <p className="lead text-secondary mb-0">
                    Create, review, and manage your writing.
                </p>
            </header>

            {isLoading && (
                <div
                    className="text-center py-5"
                    role="status"
                >
                    <div
                        className="spinner-border text-primary mb-3"
                        aria-hidden="true"
                    />

                    <p>Loading your posts…</p>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="alert alert-danger" role="alert">
                    <p>{loadError}</p>

                    <button
                        className="btn btn-outline-danger"
                        type="button"
                        onClick={() => {
                            setReloadKey((current) => current + 1)
                        }}
                    >
                        Try again
                    </button>
                </div>
            )}

            {!isLoading &&
                !loadError &&
                postsPage?.results.length === 0 && (
                    <div className="text-center py-5">
                        <h2 className="h4">No posts yet</h2>
                        <p className="text-secondary">
                            Your first draft will appear here.
                        </p>
                    </div>
                )}

            {!isLoading &&
                !loadError &&
                postsPage &&
                postsPage.results.length > 0 && (
                    <>
                        <p className="text-secondary">
                            {postsPage.count}{' '}
                            {postsPage.count === 1
                                ? 'post'
                                : 'posts'}
                        </p>

                        <div className="list-group">
                            {postsPage.results.map((post) => (
                                <article
                                    className="list-group-item py-4"
                                    key={post.id}
                                >
                                    <div className="d-flex justify-content-between gap-3">
                                        <div>
                                            <h2 className="h5">
                                                {post.title}
                                            </h2>

                                            <span className="badge text-bg-secondary text-capitalize">
                                                {post.status.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                            </span>
                                        </div>

                                        {post.status ===
                                            'published' && (
                                                <Link
                                                    to={`/posts/${post.slug}`}
                                                    className="btn btn-sm btn-outline-primary align-self-start"
                                                >
                                                    View
                                                </Link>
                                            )}
                                    </div>

                                    <p className="small text-secondary mt-3 mb-0">
                                        Updated{' '}
                                        {formatUpdatedDate(
                                            post.updated_at,
                                        )}
                                    </p>

                                    {post.review_feedback && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <strong>
                                                Editor feedback:
                                            </strong>{' '}
                                            {post.review_feedback}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                        {(postsPage.previous || postsPage.next) && (
                            <nav
                                className="d-flex justify-content-center align-items-center gap-3 mt-4"
                                aria-label="Dashboard post pages"
                            >
                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    disabled={postsPage.previous === null}
                                    onClick={() => {
                                        setPage((currentPage) =>
                                            Math.max(1, currentPage - 1),
                                        )
                                    }}
                                >
                                    Previous
                                </button>

                                <span aria-live="polite">
                                    Page {page}
                                </span>

                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    disabled={postsPage.next === null}
                                    onClick={() => {
                                        setPage(
                                            (currentPage) => currentPage + 1,
                                        )
                                    }}
                                >
                                    Next
                                </button>
                            </nav>
                        )}
                    </>
                )}
        </section>
    )
}
