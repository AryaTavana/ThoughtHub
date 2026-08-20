import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import calendarIcon from '@iconify-icons/lucide/calendar-days'
import checkCircleIcon from '@iconify-icons/lucide/check-circle-2'
import externalLinkIcon from '@iconify-icons/lucide/external-link'
import messageIcon from '@iconify-icons/lucide/message-circle'
import messagesIcon from '@iconify-icons/lucide/messages-square'
import quoteIcon from '@iconify-icons/lucide/quote'
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
import {getTextDirection} from '../textDirection'

const commentDateFormatter = new Intl.DateTimeFormat(
    undefined,
    {dateStyle: 'medium'},
)

type CommentFilter = 'all' | AuthorCommentListItem['status']

const commentFilterLabels: Record<CommentFilter, string> = {
    all: 'All comments',
    approved: 'Published',
    removed: 'Removed',
}

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
    const [activeFilter, setActiveFilter] =
        useState<CommentFilter>('all')

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

    const pageComments = commentsPage?.results ?? []
    const publishedCount = pageComments.filter(
        (comment) => comment.status === 'approved',
    ).length
    const removedCount = pageComments.filter(
        (comment) => comment.status === 'removed',
    ).length
    const visibleComments = activeFilter === 'all'
        ? pageComments
        : pageComments.filter(
            (comment) => comment.status === activeFilter,
        )
    const availableFilters = (
        Object.keys(commentFilterLabels) as CommentFilter[]
    ).filter(
        (filter) => filter === 'all' || pageComments.some(
            (comment) => comment.status === filter,
        ),
    )

    return (
        <section
            className="author-comments-panel"
            aria-labelledby="author-comments-heading"
        >
            <header className="author-comments-panel__header">
                <div className="author-comments-panel__intro">
                    <div className="author-comments-panel__icon" aria-hidden="true">
                        <Icon icon={messagesIcon}/>
                    </div>
                    <div>
                        <p className="section-eyebrow">Conversation history</p>
                        <h2 id="author-comments-heading">Your comments</h2>
                        <p>Revisit the ideas you shared and keep track of moderation notes.</p>
                    </div>
                </div>
                <div className="author-comments-panel__header-actions">
                    {commentsPage && (
                        <div className="author-comments-panel__total">
                            <strong>{commentsPage.count}</strong>
                            <span>{commentsPage.count === 1 ? 'comment' : 'comments'} total</span>
                        </div>
                    )}
                    <Link className="button button--secondary button--small" to="/">
                        Explore discussions <Icon icon={externalLinkIcon} aria-hidden="true"/>
                    </Link>
                </div>
            </header>

            {isLoading && (
                <div className="content-state content-state--compact author-comments-loading" role="status">
                    <span className="loading-ring" aria-hidden="true"/>
                    <p>Loading your comments…</p>
                </div>
            )}

            {!isLoading && loadError && (
                <div className="app-alert app-alert--danger author-comments-error" role="alert">
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
                        <div className="author-comments-empty__visual" aria-hidden="true">
                            <div><Icon icon={messageIcon}/></div>
                            <span/><span/><span/>
                        </div>
                        <div className="author-comments-empty__copy">
                            <p className="section-eyebrow">Start a conversation</p>
                            <h3>No comments yet</h3>
                            <p>When you respond to a post, your contribution and its status will be collected here.</p>
                            <Link className="button button--primary button--small" to="/">
                                Find something inspiring <Icon icon={arrowRightIcon} aria-hidden="true"/>
                            </Link>
                        </div>
                    </div>
                )}

            {!isLoading &&
                !loadError &&
                commentsPage &&
                commentsPage.results.length > 0 && (
                    <>
                        <div className="author-comments-toolbar">
                            <div className="author-comments-metrics" aria-label="Comment status summary">
                                <div><Icon icon={checkCircleIcon} aria-hidden="true"/><span><strong>{publishedCount}</strong> published</span></div>
                                <div className={removedCount > 0 ? 'has-attention' : ''}><Icon icon={shieldIcon} aria-hidden="true"/><span><strong>{removedCount}</strong> removed</span></div>
                            </div>
                            <div className="author-comments-filters" aria-label="Filter comments by status">
                                {availableFilters.map((filter) => {
                                    const filterCount = filter === 'all'
                                        ? pageComments.length
                                        : pageComments.filter(
                                            (comment) => comment.status === filter,
                                        ).length

                                    return (
                                        <button
                                            className={activeFilter === filter ? 'active' : ''}
                                            type="button"
                                            aria-pressed={activeFilter === filter}
                                            key={filter}
                                            onClick={() => setActiveFilter(filter)}
                                        >
                                            {commentFilterLabels[filter]} <span>{filterCount}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {visibleComments.length === 0 ? (
                            <div className="author-comments-filter-empty">
                                <Icon icon={messageIcon} aria-hidden="true"/>
                                <h3>No comments in this view</h3>
                                <button type="button" onClick={() => setActiveFilter('all')}>Show all comments</button>
                            </div>
                        ) : (
                            <div className="author-comment-list">
                                {visibleComments.map((comment) => (
                                    <article
                                        className={`author-comment-card author-comment-card--${comment.status}`}
                                        key={comment.id}
                                    >
                                        <div className="author-comment-card__mark" aria-hidden="true">
                                            <Icon icon={quoteIcon}/>
                                        </div>
                                        <div className="author-comment-card__body">
                                            <div className="author-comment-card__topline">
                                                <div>
                                                    <span>Commented on</span>
                                                    <h3 dir={getTextDirection(comment.post_title)}>
                                                        {comment.post_status === 'published' ? (
                                                            <Link to={`/posts/${comment.post_slug}`}>
                                                                {comment.post_title} <Icon icon={externalLinkIcon} aria-hidden="true"/>
                                                            </Link>
                                                        ) : (
                                                            comment.post_title
                                                        )}
                                                    </h3>
                                                </div>
                                                <span className={`status-badge status-badge--${comment.status}`}>
                                                    {comment.status === 'approved' ? 'published' : 'removed'}
                                                </span>
                                            </div>

                                            <blockquote className="author-comment-card__content">
                                                <p dir={getTextDirection(comment.content)} style={{whiteSpace: 'pre-wrap'}}>{comment.content}</p>
                                            </blockquote>

                                            <div className="author-comment-card__footer">
                                                <time dateTime={comment.created_at}>
                                                    <Icon icon={calendarIcon} aria-hidden="true"/>Shared {formatCommentDate(comment.created_at)}
                                                </time>
                                            </div>

                                            {comment.moderation_feedback && (
                                                <div className="moderation-inline-feedback">
                                                    <Icon icon={shieldIcon} aria-hidden="true"/>
                                                    <div><strong>Moderation feedback</strong><p>{comment.moderation_feedback}</p></div>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {(commentsPage.previous ||
                            commentsPage.next) && (
                            <nav
                                className="pagination-bar"
                                aria-label="Dashboard comment pages"
                            >
                                <button
                                    className="button button--secondary"
                                    type="button"
                                    disabled={commentsPage.previous === null}
                                    onClick={() => {
                                        setActiveFilter('all')
                                        setPage((currentPage) =>
                                            Math.max(1, currentPage - 1),
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
                                        setActiveFilter('all')
                                        setPage((currentPage) => currentPage + 1)
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
