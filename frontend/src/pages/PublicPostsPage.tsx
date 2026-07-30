import {
    useEffect,
    useState,
} from 'react'
import {Link} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {
    getPublishedPosts,
    type PaginatedResponse,
    type PublicPostListItem,
} from '../api/posts'

const publishedDateFormatter = new Intl.DateTimeFormat(
    undefined,
    {
        dateStyle: 'medium',
    },
)

function formatPublishedDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return publishedDateFormatter.format(date)
}

export function PublicPostsPage() {
    const [postsPage, setPostsPage] =
        useState<PaginatedResponse<PublicPostListItem> | null>(
            null,
        )
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] =
        useState<string | null>(null)

    useEffect(() => {
        let isCancelled = false

        async function loadPosts() {
            setIsLoading(true)
            setLoadError(null)
            setPostsPage(null)

            try {
                const response = await getPublishedPosts({page})

                if (!isCancelled) {
                    setPostsPage(response)
                }
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(
                        getApiErrorMessage(
                            error,
                            'Unable to load published posts.',
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
                <h1>ThoughtHub</h1>
                <p className="lead text-secondary mb-0">
                    Discover ideas and stories from our community.
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

                    <p className="mb-0">
                        Loading published posts…
                    </p>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="alert alert-danger" role="alert">
                    <p className="mb-3">{loadError}</p>

                    <button
                        className="btn btn-outline-danger"
                        type="button"
                        onClick={() => {
                            setReloadKey(
                                (currentKey) => currentKey + 1,
                            )
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
                        <h2 className="h4">
                            No published posts yet
                        </h2>

                        <p className="text-secondary mb-0">
                            Please check again later.
                        </p>
                    </div>
                )}

            {!isLoading &&
                !loadError &&
                postsPage &&
                postsPage.results.length > 0 && (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="h3 mb-0">
                                Latest posts
                            </h2>

                            <span className="text-secondary">
                                {postsPage.count}{' '}
                                {postsPage.count === 1
                                    ? 'post'
                                    : 'posts'}
                            </span>
                        </div>

                        <div className="row g-4">
                            {postsPage.results.map((post) => (
                                <div
                                    className="col-12 col-md-6 col-lg-4"
                                    key={post.id}
                                >
                                    <article className="card h-100 shadow-sm overflow-hidden">
                                        {post.featured_image && (
                                            <img
                                                className="card-img-top"
                                                src={post.featured_image}
                                                alt={
                                                    post.featured_image_alt
                                                }
                                                loading="lazy"
                                                style={{
                                                    height: '220px',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                        )}

                                        <div className="card-body d-flex flex-column">
                                            <div className="d-flex flex-wrap gap-2 mb-3">
                                                <span className="badge text-bg-primary text-capitalize">
                                                    {post.post_type}
                                                </span>

                                                {post.category && (
                                                    <span className="badge text-bg-secondary">
                                                        {
                                                            post
                                                                .category
                                                                .name
                                                        }
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="h5 card-title">
                                                <Link
                                                    className="text-decoration-none"
                                                    to={`/posts/${post.slug}`}
                                                >
                                                    {post.title}
                                                </Link>
                                            </h3>

                                            {post.excerpt && (
                                                <p className="card-text text-secondary">
                                                    {post.excerpt}
                                                </p>
                                            )}

                                            <div className="mt-auto">
                                                {post.tags.length > 0 && (
                                                    <div className="d-flex flex-wrap gap-2 mb-3">
                                                        {post.tags.map(
                                                            (tag) => (
                                                                <span
                                                                    className="badge rounded-pill text-bg-dark"
                                                                    key={
                                                                        tag.id
                                                                    }
                                                                >
                                                                    #
                                                                    {
                                                                        tag.name
                                                                    }
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                )}

                                                <p className="small text-secondary mb-1">
                                                    By{' '}
                                                    {post.author_username ??
                                                        'Deleted user'}
                                                </p>

                                                <p className="small text-secondary mb-0">
                                                    <time
                                                        dateTime={
                                                            post.published_at
                                                        }
                                                    >
                                                        {formatPublishedDate(
                                                            post.published_at,
                                                        )}
                                                    </time>
                                                    {' · '}
                                                    {post.reading_time}{' '}
                                                    min read
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            ))}
                        </div>

                        {(postsPage.previous ||
                            postsPage.next) && (
                            <nav
                                className="d-flex justify-content-center align-items-center gap-3 mt-5"
                                aria-label="Published post pages"
                            >
                                <button
                                    className="btn btn-outline-primary"
                                    type="button"
                                    disabled={
                                        postsPage.previous === null
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
                                            (currentPage) =>
                                                currentPage + 1,
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
