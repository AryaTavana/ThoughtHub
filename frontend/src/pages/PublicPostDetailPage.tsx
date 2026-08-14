import {
    useEffect,
    useState,
} from 'react'
import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowUpRightIcon from '@iconify-icons/lucide/arrow-up-right'
import bookOpenIcon from '@iconify-icons/lucide/book-open'
import clockIcon from '@iconify-icons/lucide/clock-3'
import calendarIcon from '@iconify-icons/lucide/calendar-days'
import eyeIcon from '@iconify-icons/lucide/eye'
import messageIcon from '@iconify-icons/lucide/message-circle'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import tagIcon from '@iconify-icons/lucide/tag'
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
import {PostCommentsSection} from '../components/PostCommentsSection'
import {SavedPostButton} from '../components/SavedPostButton'
import {
    containsSupportedMarkup,
    sanitizeRichText,
} from '../richText'

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
        <section className="app-shell post-detail-page">
            <Link
                className="post-detail-back"
                to="/"
            >
                <Icon icon={arrowLeftIcon} aria-hidden="true"/> All posts
            </Link>

            {isLoading && (
                <div className="content-state" role="status">
                    <span className="loading-ring" aria-hidden="true"/>
                    <p>Loading post…</p>
                </div>
            )}

            {!isLoading && isNotFound && (
                <div className="empty-state">
                    <h1>Post not found</h1>

                    <p>
                        This post may not exist, may not be
                        published, or may have been removed.
                    </p>

                    <Link className="button button--primary" to="/">
                        Browse published posts
                    </Link>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="app-alert app-alert--danger" role="alert">
                    <p>{loadError}</p>

                    <button
                        className="button button--secondary"
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
                    <article className="post-article">
                        <header className="post-article__hero">
                            <div className="post-article__hero-copy">
                                <div className="post-article__labels">
                                    <span className="content-label">
                                        {post.post_type}
                                    </span>

                                    {post.category &&
                                        post.category.name.toLowerCase() !==
                                            post.post_type.toLowerCase() && (
                                        <Link
                                            className="content-label"
                                            to={`/categories/${post.category.slug}`}
                                        >
                                            {post.category.name}
                                        </Link>
                                    )}
                                </div>

                                <h1>{post.title}</h1>

                                {post.excerpt && (
                                    <p className="post-article__excerpt">
                                        {post.excerpt}
                                    </p>
                                )}
                            </div>

                            <aside
                                className="post-article__sidecar"
                                aria-label="Post details"
                            >
                                <div className="post-article__author">
                                    <span aria-hidden="true">
                                        {(post.author_username ?? 'T')
                                            .charAt(0)
                                            .toUpperCase()}
                                    </span>

                                    <div>
                                        <small>Written by</small>
                                        {post.author_username ? (
                                            <Link
                                                to={`/profile/${post.author_username}`}
                                            >
                                                By {post.author_username}
                                            </Link>
                                        ) : (
                                            <strong>By Deleted user</strong>
                                        )}
                                    </div>
                                </div>

                                <div className="post-article__facts">
                                    <div>
                                        <Icon icon={calendarIcon} aria-hidden="true"/>
                                        <span>
                                            <small>Published</small>
                                            <time dateTime={post.published_at}>
                                                {formatPostDate(post.published_at)}
                                            </time>
                                        </span>
                                    </div>

                                    <div>
                                        <Icon icon={clockIcon} aria-hidden="true"/>
                                        <span>
                                            <small>Reading time</small>
                                            <strong>{post.reading_time} min read</strong>
                                        </span>
                                    </div>

                                    <div>
                                        <Icon icon={eyeIcon} aria-hidden="true"/>
                                        <span>
                                            <small>Readers</small>
                                            <strong>{post.views} {post.views === 1 ? 'view' : 'views'}</strong>
                                        </span>
                                    </div>

                                    <div>
                                        <Icon icon={messageIcon} aria-hidden="true"/>
                                        <span>
                                            <small>Discussion</small>
                                            <strong>{post.comments} {post.comments === 1 ? 'comment' : 'comments'}</strong>
                                        </span>
                                    </div>
                                </div>

                                {post.tags.length > 0 && (
                                    <div className="post-article__tag-group">
                                        <span>
                                            <Icon icon={tagIcon} aria-hidden="true"/>
                                            Tags
                                        </span>
                                        <div className="post-tags post-article__tags">
                                            {post.tags.map((tag) => (
                                                <Link
                                                    key={tag.id}
                                                    to={`/tags/${tag.slug}`}
                                                >
                                                    #{tag.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <SavedPostButton post={{slug: post.slug, title: post.title, excerpt: post.excerpt, author: post.author_username ?? 'Deleted user', category: post.category?.name ?? post.post_type, readingTime: post.reading_time}}/>
                            </aside>
                        </header>

                        {post.featured_image && (
                            <figure className="post-article__featured-image">
                                <img
                                    src={post.featured_image}
                                    alt={
                                        post.featured_image_alt
                                    }
                                />
                            </figure>
                        )}

                        <div className="post-article__reading-layout">
                            <aside
                                className="post-article__reading-rail"
                                aria-label="Reading guide"
                            >
                                <div>
                                    <span className="section-eyebrow">
                                        <Icon icon={bookOpenIcon} aria-hidden="true"/>
                                        Reading
                                    </span>
                                    <strong>
                                        {post.reading_time}{' '}
                                        {post.reading_time === 1 ? 'minute' : 'minutes'}
                                    </strong>
                                    <p>A thought shared with the university community.</p>
                                </div>

                                <a href="#discussion">
                                    Join the discussion
                                    <Icon icon={arrowUpRightIcon} aria-hidden="true"/>
                                </a>
                            </aside>

                            <div className="post-article__reading-column">
                                <div className="post-article__body">
                                    {post.content && (
                                        containsSupportedMarkup(post.content) ? (
                                            <div
                                                className="post-article__legacy-content"
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeRichText(post.content),
                                                }}
                                            />
                                        ) : (
                                            <div className="post-article__legacy-content">
                                                <p className="post-article__plain-content">
                                                    {post.content}
                                                </p>
                                            </div>
                                        )
                                    )}

                                    <div className="post-content">
                                        {post.blocks.map((block) => (
                                            <PostContentBlock
                                                block={block}
                                                key={block.id}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <footer className="post-article__footer">
                                    <div className="post-article__footer-author">
                                        <span aria-hidden="true">
                                            <Icon icon={penLineIcon}/>
                                        </span>
                                        <div>
                                            <strong>
                                                Shared by {post.author_username ?? 'a former member'}
                                            </strong>
                                            <p>
                                                Last updated{' '}
                                                <time dateTime={post.updated_at}>
                                                    {formatPostDate(post.updated_at)}
                                                </time>
                                            </p>
                                        </div>
                                    </div>

                                    <Link to="/">
                                        Explore more posts
                                        <Icon icon={arrowUpRightIcon} aria-hidden="true"/>
                                    </Link>
                                </footer>
                            </div>
                        </div>

                        <div
                            className="post-article__discussion"
                            id="discussion"
                        >
                            <PostCommentsSection
                                key={post.slug}
                                slug={post.slug}
                                allowComments={post.allow_comments}
                            />
                        </div>
                    </article>
                )}
        </section>
    )
}
