import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import barChartIcon from '@iconify-icons/lucide/bar-chart-3'
import bookOpenIcon from '@iconify-icons/lucide/book-open'
import clockIcon from '@iconify-icons/lucide/clock-3'
import editIcon from '@iconify-icons/lucide/edit-3'
import eyeIcon from '@iconify-icons/lucide/eye'
import fileStackIcon from '@iconify-icons/lucide/file-stack'
import fileTextIcon from '@iconify-icons/lucide/file-text'
import messageIcon from '@iconify-icons/lucide/message-circle'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import plusIcon from '@iconify-icons/lucide/plus'
import sparklesIcon from '@iconify-icons/lucide/sparkles'
import {useEffect, useState} from 'react'
import {Link} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {
    getAuthorPosts,
    type AuthorPostListItem,
    type PaginatedResponse,
} from '../api/posts'
import {AuthorCommentsPanel} from '../components/AuthorCommentsPanel'
import {getTextDirection} from '../textDirection'

const updatedDateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
})

type DashboardFilter = 'all' | AuthorPostListItem['status']

const filterLabels: Record<DashboardFilter, string> = {
    all: 'All posts',
    published: 'Published',
    draft: 'Drafts',
    removed: 'Needs revision',
    archived: 'Archived',
}

function formatUpdatedDate(value: string): string {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : updatedDateFormatter.format(date)
}

function formatPostType(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ')
}

export function DashboardPage() {
    const [postsPage, setPostsPage] =
        useState<PaginatedResponse<AuthorPostListItem> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [page, setPage] = useState(1)
    const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all')

    useEffect(() => {
        let isCancelled = false

        async function loadPosts() {
            setIsLoading(true)
            setLoadError(null)

            try {
                const response = await getAuthorPosts({page})
                if (!isCancelled) setPostsPage(response)
            } catch (error) {
                if (!isCancelled) {
                    setLoadError(getApiErrorMessage(error, 'Unable to load your posts.'))
                }
            } finally {
                if (!isCancelled) setIsLoading(false)
            }
        }

        void loadPosts()
        return () => { isCancelled = true }
    }, [page, reloadKey])

    const pagePosts = postsPage?.results ?? []
    const publishedCount = pagePosts.filter((post) => post.status === 'published').length
    const draftCount = pagePosts.filter((post) => post.status === 'draft').length
    const removedCount = pagePosts.filter((post) => post.status === 'removed').length
    const totalViews = pagePosts.reduce((total, post) => total + post.views, 0)
    const totalComments = pagePosts.reduce((total, post) => total + post.comments, 0)
    const visiblePosts = activeFilter === 'all'
        ? pagePosts
        : pagePosts.filter((post) => post.status === activeFilter)
    const availableFilters = (Object.keys(filterLabels) as DashboardFilter[])
        .filter((filter) => filter === 'all' || pagePosts.some((post) => post.status === filter))

    return (
        <section className="app-shell dashboard-page">
            <header className="dashboard-hero">
                <div className="dashboard-hero__content">
                    <p className="section-eyebrow"><Icon icon={sparklesIcon} aria-hidden="true"/>Author studio</p>
                    <h1>Your writing, all in one place.</h1>
                    <p>Shape new ideas, track what readers love, and keep every draft moving forward.</p>
                    <div className="dashboard-hero__actions">
                        <Link className="button button--primary" to="/dashboard/posts/new"><Icon icon={plusIcon} aria-hidden="true"/>New post</Link>
                        <Link className="button dashboard-hero__secondary" to="/"><Icon icon={bookOpenIcon} aria-hidden="true"/>Explore community</Link>
                    </div>
                </div>
                <div className="dashboard-hero__aside" aria-label="Workspace summary">
                    <div className="dashboard-hero__aside-icon" aria-hidden="true"><Icon icon={penLineIcon}/></div>
                    <p>Make space for your next idea.</p>
                    <span>{postsPage?.count ?? 0} {postsPage?.count === 1 ? 'piece' : 'pieces'} in your library</span>
                    <div className="dashboard-hero__ornament" aria-hidden="true"><span/><span/><span/></div>
                </div>
            </header>

            {postsPage && postsPage.count > 0 && (
                <section className="dashboard-overview" aria-labelledby="dashboard-overview-heading">
                    <div className="dashboard-overview__heading">
                        <div>
                            <p className="section-eyebrow">At a glance</p>
                            <h2 id="dashboard-overview-heading">Your publishing pulse</h2>
                        </div>
                        <p>Post-level activity reflects the items on this page.</p>
                    </div>
                    <div className="dashboard-stats">
                        <article className="dashboard-stat dashboard-stat--featured">
                            <div className="dashboard-stat__icon"><Icon icon={fileStackIcon} aria-hidden="true"/></div>
                            <div><span>Total posts</span><strong>{postsPage.count}</strong><small>Across your library</small></div>
                        </article>
                        <article className="dashboard-stat">
                            <div className="dashboard-stat__icon dashboard-stat__icon--success"><Icon icon={bookOpenIcon} aria-hidden="true"/></div>
                            <div><span>Published</span><strong>{publishedCount}</strong><small>{draftCount} {draftCount === 1 ? 'draft' : 'drafts'} in progress</small></div>
                        </article>
                        <article className="dashboard-stat">
                            <div className="dashboard-stat__icon"><Icon icon={eyeIcon} aria-hidden="true"/></div>
                            <div><span>Reader views</span><strong>{totalViews.toLocaleString()}</strong><small>On this page</small></div>
                        </article>
                        <article className="dashboard-stat">
                            <div className="dashboard-stat__icon dashboard-stat__icon--accent"><Icon icon={messageIcon} aria-hidden="true"/></div>
                            <div><span>Responses</span><strong>{totalComments.toLocaleString()}</strong><small>Reader comments</small></div>
                        </article>
                    </div>
                    {removedCount > 0 && (
                        <div className="dashboard-attention" role="note">
                            <Icon icon={sparklesIcon} aria-hidden="true"/>
                            <p><strong>{removedCount} {removedCount === 1 ? 'post needs' : 'posts need'} your attention.</strong> Review the moderation notes to get {removedCount === 1 ? 'it' : 'them'} ready to publish.</p>
                            <button type="button" onClick={() => setActiveFilter('removed')}>Show feedback <Icon icon={arrowRightIcon} aria-hidden="true"/></button>
                        </div>
                    )}
                </section>
            )}

            {isLoading && <div className="content-state dashboard-loading" role="status"><span className="loading-ring" aria-hidden="true"/><p>Loading your posts…</p></div>}

            {!isLoading && loadError && <div className="app-alert app-alert--danger dashboard-load-error" role="alert"><p>{loadError}</p><button className="button button--secondary" type="button" onClick={() => setReloadKey((current) => current + 1)}>Try again</button></div>}

            {!isLoading && !loadError && postsPage?.results.length === 0 && (
                <div className="empty-state dashboard-empty"><div className="dashboard-empty__mark"><Icon icon={penLineIcon} aria-hidden="true"/></div><p className="section-eyebrow">A blank page</p><h2>No posts yet</h2><p>Your first draft will appear here.</p><Link className="button button--primary" to="/dashboard/posts/new">Create your first post</Link></div>
            )}

            {!isLoading && !loadError && postsPage && postsPage.results.length > 0 && (
                <section className="dashboard-posts" aria-labelledby="dashboard-posts-heading">
                    <div className="dashboard-posts__header">
                        <div>
                            <p className="section-eyebrow">Writing library</p>
                            <h2 id="dashboard-posts-heading">{postsPage.count} {postsPage.count === 1 ? 'post' : 'posts'}</h2>
                            <p>Showing {pagePosts.length} on page {page}</p>
                        </div>
                        <div className="dashboard-post-filters" aria-label="Filter posts by status">
                            {availableFilters.map((filter) => {
                                const filterCount = filter === 'all'
                                    ? pagePosts.length
                                    : pagePosts.filter((post) => post.status === filter).length

                                return (
                                    <button
                                        className={activeFilter === filter ? 'active' : ''}
                                        type="button"
                                        aria-pressed={activeFilter === filter}
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                    >
                                        {filterLabels[filter]} <span>{filterCount}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {visiblePosts.length === 0 ? (
                        <div className="dashboard-filter-empty">
                            <Icon icon={fileTextIcon} aria-hidden="true"/>
                            <h3>No posts in this view</h3>
                            <p>Choose another status to see the rest of your library.</p>
                            <button type="button" onClick={() => setActiveFilter('all')}>Show all posts</button>
                        </div>
                    ) : (
                        <div className="dashboard-post-list">
                            {visiblePosts.map((post) => (
                                <article className={`dashboard-post dashboard-post--${post.status}`} key={post.id}>
                                    <div className={`dashboard-post__visual ${post.featured_image ? 'dashboard-post__visual--image' : ''}`}>
                                        {post.featured_image ? (
                                            <img
                                                src={post.featured_image}
                                                alt={post.featured_image_alt}
                                            />
                                        ) : (
                                            <div><Icon icon={post.status === 'removed' ? messageIcon : fileTextIcon} aria-hidden="true"/><span>{formatPostType(post.post_type)}</span></div>
                                        )}
                                    </div>
                                    <div className="dashboard-post__body">
                                        <div className="dashboard-post__topline">
                                            <span className={`status-badge status-badge--${post.status}`}>{post.status.replace('_', ' ')}</span>
                                            <span>{formatPostType(post.post_type)}</span>
                                        </div>
                                        <h3 dir={getTextDirection(post.title)}>{post.title}</h3>
                                        {post.excerpt && <p className="dashboard-post__excerpt" dir={getTextDirection(post.excerpt)}>{post.excerpt}</p>}
                                        <div className="dashboard-post__meta">
                                            <span><Icon icon={clockIcon} aria-hidden="true"/>Updated {formatUpdatedDate(post.updated_at)}</span>
                                            <span><Icon icon={barChartIcon} aria-hidden="true"/>{post.views.toLocaleString()} views</span>
                                            <span><Icon icon={messageIcon} aria-hidden="true"/>{post.comments.toLocaleString()} comments</span>
                                        </div>
                                        {post.review_feedback && <div className="moderation-inline-feedback"><Icon icon={messageIcon} aria-hidden="true"/><div><strong>Moderation feedback</strong><p>{post.review_feedback}</p><Link to={`/dashboard/posts/${post.id}/removed`}>Review next steps <Icon icon={arrowRightIcon} aria-hidden="true"/></Link></div></div>}
                                    </div>
                                    <div className="dashboard-post__actions">
                                        <Link className="button button--secondary button--small" to={`/dashboard/posts/${post.id}/edit`}><Icon icon={editIcon} aria-hidden="true"/>Edit</Link>
                                        {post.status === 'published' && <Link className="button button--secondary button--small" to={`/posts/${post.slug}`}><Icon icon={eyeIcon} aria-hidden="true"/>View</Link>}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {(postsPage.previous || postsPage.next) && <nav className="pagination-bar" aria-label="Dashboard post pages"><button className="button button--secondary" type="button" disabled={postsPage.previous === null} onClick={() => { setActiveFilter('all'); setPage((current) => Math.max(1, current - 1)) }}><Icon icon={arrowLeftIcon} aria-hidden="true"/>Previous</button><span aria-live="polite">Page {page}</span><button className="button button--secondary" type="button" disabled={postsPage.next === null} onClick={() => { setActiveFilter('all'); setPage((current) => current + 1) }}>Next<Icon icon={arrowRightIcon} aria-hidden="true"/></button></nav>}
                </section>
            )}

            <AuthorCommentsPanel/>
        </section>
    )
}
