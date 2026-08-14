import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import messageIcon from '@iconify-icons/lucide/message-circle'
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

    function handleCommentPublished() {
        if (page === 1) {
            setReloadKey((currentKey) => currentKey + 1)
        } else {
            setPage(1)
        }
    }

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
            className="post-comments"
            aria-labelledby="post-comments-heading"
        >
            <div className="post-comments__heading">
                <div>
                    <p className="section-eyebrow">Student conversation</p>
                    <h2 id="post-comments-heading">Comments</h2>
                    <p>Responses from readers across the ThoughtHub community.</p>
                </div>

                {commentsPage && (
                    <span className="post-count">
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
                onCommentPublished={handleCommentPublished}
            />

            {isLoading && (
                <div
                    className="content-state content-state--compact"
                    role="status"
                >
                    <span className="loading-ring" aria-hidden="true"/>
                    <p>Loading comments…</p>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="app-alert app-alert--danger" role="alert">
                    <p>{loadError}</p>

                    <button
                        className="button button--secondary button--small"
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
                    <div className="comments-empty-state">
                        <Icon icon={messageIcon} aria-hidden="true"/>
                        <div><h3>No comments yet.</h3><p>Be the first student to add a thoughtful response.</p></div>
                    </div>
                )}

            {!isLoading &&
                !loadError &&
                commentsPage &&
                commentsPage.results.length > 0 && (
                    <>
                        <ol className="public-comment-list">
                            {commentsPage.results.map(
                                (comment, index) => (
                                    <li key={comment.id}>
                                        <article className="public-comment-card">
                                                <header>
                                                    <div className="public-comment-card__author">
                                                        <span aria-hidden="true">{comment.author_username.slice(0, 1).toUpperCase()}</span>
                                                        <div><h3>
                                                        {
                                                            comment.author_username
                                                        }
                                                        </h3><small>ThoughtHub reader · Reply {String(index + 1).padStart(2, '0')}</small></div>
                                                    </div>

                                                    <time
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
                                                    className="public-comment-card__content"
                                                    style={{
                                                        whiteSpace:
                                                            'pre-wrap',
                                                    }}
                                                >
                                                    {comment.content}
                                                </p>
                                        </article>
                                    </li>
                                ),
                            )}
                        </ol>

                        {(commentsPage.previous ||
                            commentsPage.next) && (
                            <nav
                                className="pagination-bar"
                                aria-label="Comment pages"
                            >
                                <button
                                    className="button button--secondary button--small"
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
                                    <Icon icon={arrowLeftIcon} aria-hidden="true"/> Previous comments
                                </button>

                                <span
                                    aria-live="polite"
                                >
                                    Page {page}
                                </span>

                                <button
                                    className="button button--secondary button--small"
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
                                    Next comments <Icon icon={arrowRightIcon} aria-hidden="true"/>
                                </button>
                            </nav>
                        )}
                    </>
                )}
        </section>
    )
}
