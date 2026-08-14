import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import messageIcon from '@iconify-icons/lucide/message-circle'
import shieldIcon from '@iconify-icons/lucide/shield-check'
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
            className="author-comments-panel"
            aria-labelledby="author-comments-heading"
        >
            <header className="author-comments-panel__header">
                <div className="author-comments-panel__icon" aria-hidden="true">
                    <Icon icon={messageIcon}/>
                </div>
                <div>
                    <p className="section-eyebrow">Your conversations</p>
                    <h2 id="author-comments-heading">Your comments</h2>
                    <p>Track published comments and any feedback from moderators.</p>
                </div>
                {commentsPage && (
                    <span className="post-count">
                        {commentsPage.count} {commentsPage.count === 1 ? 'comment' : 'comments'}
                    </span>
                )}
            </header>

            {isLoading && (
                <div className="content-state content-state--compact" role="status">
                    <span className="loading-ring" aria-hidden="true"/>
                    <p>Loading your comments…</p>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="app-alert app-alert--danger" role="alert">
                    <p>{loadError}</p>
                    <button
                        className="button button--secondary button--small"
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
                    <div className="author-comments-empty">
                        <Icon icon={messageIcon} aria-hidden="true"/>
                        <div>
                            <h3>No comments yet</h3>
                            <p>Your conversations will be collected here after you join a post discussion.</p>
                        </div>
                        <Link className="button button--secondary button--small" to="/">Explore posts</Link>
                    </div>
                )}

            {!isLoading &&
                !loadError &&
                commentsPage &&
                commentsPage.results.length > 0 && (
                    <>
                        <div className="author-comment-list">
                            {commentsPage.results.map((comment) => (
                                <article
                                    className="author-comment-card"
                                    key={comment.id}
                                >
                                    <div className="author-comment-card__topline">
                                        <div className="author-comment-card__mark" aria-hidden="true">
                                            <Icon icon={messageIcon}/>
                                        </div>
                                        <div>
                                            <span>Comment on</span>
                                            <h3>
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
                                        </div>
                                        <span className={`status-badge status-badge--${comment.status}`}>
                                            {comment.status}
                                        </span>
                                    </div>

                                    <p
                                        className="author-comment-card__content"
                                        style={{whiteSpace: 'pre-wrap'}}
                                    >
                                        {comment.content}
                                    </p>

                                    <time dateTime={comment.created_at}>Published {formatCommentDate(comment.created_at)}</time>

                                    {comment.moderation_feedback && (
                                        <div className="moderation-inline-feedback">
                                            <Icon icon={shieldIcon} aria-hidden="true"/>
                                            <div><strong>Moderation feedback</strong><p>{comment.moderation_feedback}</p></div>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>

                        {(commentsPage.previous ||
                            commentsPage.next) && (
                            <nav
                                className="pagination-bar"
                                aria-label="Dashboard comment pages"
                            >
                                <button
                                    className="button button--secondary"
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
                                <span aria-live="polite">
                                    Comment page {page}
                                </span>
                                <button
                                    className="button button--secondary"
                                    type="button"
                                    disabled={commentsPage.next === null}
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
