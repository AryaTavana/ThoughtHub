import {
    useEffect,
    useState,
} from 'react'
import {
    Link,
    useParams,
} from 'react-router-dom'

import {ApiError} from '../api/client'
import {getApiErrorMessage} from '../api/errors'
import {
    getPublishedPost,
    type PublicPostDetail,
} from '../api/posts'
import {PostContentBlock} from '../components/PostContentBlock'

const postDateFormatter = new Intl.DateTimeFormat(
    undefined,
    {
        dateStyle: 'medium',
    },
)

function formatPostDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return postDateFormatter.format(date)
}

export function PublicPostDetailPage() {
    const {slug} = useParams<{slug: string}>()

    const [post, setPost] =
        useState<PublicPostDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isNotFound, setIsNotFound] = useState(false)
    const [loadError, setLoadError] =
        useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let isCancelled = false

        async function loadPost() {
            setPost(null)
            setIsLoading(true)
            setIsNotFound(false)
            setLoadError(null)

            if (!slug) {
                setLoadError('The post address is invalid.')
                setIsLoading(false)
                return
            }

            try {
                const response =
                    await getPublishedPost(slug)

                if (!isCancelled) {
                    setPost(response)
                }
            } catch (error) {
                if (isCancelled) {
                    return
                }

                if (
                    error instanceof ApiError &&
                    error.status === 404
                ) {
                    setIsNotFound(true)
                    return
                }

                setLoadError(
                    getApiErrorMessage(
                        error,
                        'Unable to load this post.',
                    ),
                )
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadPost()

        return () => {
            isCancelled = true
        }
    }, [slug, reloadKey])

    useEffect(() => {
        if (!post) {
            return
        }

        const previousTitle = document.title
        document.title = post.meta_title || post.title

        return () => {
            document.title = previousTitle
        }
    }, [post])

    return (
        <section className="container py-5">
            <Link
                className="d-inline-block mb-4 text-decoration-none"
                to="/"
            >
                ← All posts
            </Link>

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
                        Loading post…
                    </p>
                </div>
            )}

            {!isLoading && isNotFound && (
                <div className="text-center py-5">
                    <h1>Post not found</h1>

                    <p className="text-secondary">
                        This post may not exist, may not be
                        published, or may have been removed.
                    </p>

                    <Link className="btn btn-primary" to="/">
                        Browse published posts
                    </Link>
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
                !isNotFound &&
                !loadError &&
                post && (
                    <article>
                        <header className="col-lg-9 col-xl-8 mx-auto text-center mb-5">
                            <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                                <span className="badge text-bg-primary text-capitalize">
                                    {post.post_type}
                                </span>

                                {post.category && (
                                    <span className="badge text-bg-secondary">
                                        {post.category.name}
                                    </span>
                                )}
                            </div>

                            <h1 className="display-5 fw-bold">
                                {post.title}
                            </h1>

                            {post.excerpt && (
                                <p className="lead text-secondary mt-3">
                                    {post.excerpt}
                                </p>
                            )}

                            <div className="d-flex flex-wrap justify-content-center gap-2 text-secondary mt-4">
                                <span>
                                    By{' '}
                                    {post.author_username ??
                                        'Deleted user'}
                                </span>

                                <span aria-hidden="true">·</span>

                                <time dateTime={post.published_at}>
                                    {formatPostDate(
                                        post.published_at,
                                    )}
                                </time>

                                <span aria-hidden="true">·</span>

                                <span>
                                    {post.reading_time} min read
                                </span>
                            </div>

                            {post.tags.length > 0 && (
                                <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
                                    {post.tags.map((tag) => (
                                        <span
                                            className="badge rounded-pill text-bg-dark"
                                            key={tag.id}
                                        >
                                            #{tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </header>

                        {post.featured_image && (
                            <figure className="col-xl-10 mx-auto mb-5">
                                <img
                                    className="img-fluid rounded w-100"
                                    src={post.featured_image}
                                    alt={
                                        post.featured_image_alt
                                    }
                                    style={{
                                        maxHeight: '560px',
                                        objectFit: 'cover',
                                    }}
                                />
                            </figure>
                        )}

                        {post.content && (
                            <div className="col-lg-8 mx-auto mb-4">
                                <p
                                    className="lead"
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {post.content}
                                </p>
                            </div>
                        )}

                        <div className="post-content">
                            {post.blocks.map((block) => (
                                <PostContentBlock
                                    block={block}
                                    key={block.id}
                                />
                            ))}
                        </div>

                        <footer className="col-lg-8 mx-auto mt-5 pt-4 border-top">
                            <p className="small text-secondary">
                                Last updated{' '}
                                <time dateTime={post.updated_at}>
                                    {formatPostDate(
                                        post.updated_at,
                                    )}
                                </time>
                            </p>

                            {!post.allow_comments && (
                                <div
                                    className="alert alert-secondary"
                                    role="status"
                                >
                                    Comments are closed for this
                                    post.
                                </div>
                            )}
                        </footer>
                    </article>
                )}
        </section>
    )
}
