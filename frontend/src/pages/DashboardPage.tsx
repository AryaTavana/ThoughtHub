import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import editIcon from '@iconify-icons/lucide/edit-3'
import eyeIcon from '@iconify-icons/lucide/eye'
import fileTextIcon from '@iconify-icons/lucide/file-text'
import messageIcon from '@iconify-icons/lucide/message-square'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import plusIcon from '@iconify-icons/lucide/plus'
import {useEffect, useState} from 'react'
import {Link} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {
    getAuthorPosts,
    type AuthorPostListItem,
    type PaginatedResponse,
} from '../api/posts'
import {AuthorCommentsPanel} from '../components/AuthorCommentsPanel'

const updatedDateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
})

function formatUpdatedDate(value: string): string {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : updatedDateFormatter.format(date)
}

export function DashboardPage() {
    const [postsPage, setPostsPage] =
        useState<PaginatedResponse<AuthorPostListItem> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [page, setPage] = useState(1)

    useEffect(() => {
        let isCancelled = false
        async function loadPosts() {
            setIsLoading(true)
            setLoadError(null)
            try {
                const response = await getAuthorPosts({page})
                if (!isCancelled) setPostsPage(response)
            } catch (error) {
                if (!isCancelled) setLoadError(getApiErrorMessage(error, 'Unable to load your posts.'))
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

    return (
        <section className="app-shell dashboard-page">
            <header className="dashboard-header">
                <div><p className="section-eyebrow">Author workspace</p><h1>Your posts</h1><p>Create, publish, and manage your writing.</p></div>
                <Link className="button button--primary" to="/dashboard/posts/new"><Icon icon={plusIcon} aria-hidden="true"/>New post</Link>
            </header>

            {postsPage && postsPage.count > 0 && (
                <div className="dashboard-stats" aria-label="Post summary">
                    <div><span>Total posts</span><strong>{postsPage.count}</strong><small>Across your ThoughtHub account</small></div>
                    <div><span>Published here</span><strong>{publishedCount}</strong><small>Visible to readers</small></div>
                    <div><span>Drafts here</span><strong>{draftCount}</strong><small>Still being shaped</small></div>
                    <div><span>Needs revision</span><strong>{removedCount}</strong><small>Feedback is waiting</small></div>
                </div>
            )}

            {isLoading && <div className="content-state" role="status"><span className="loading-ring" aria-hidden="true"/><p>Loading your posts…</p></div>}

            {!isLoading && loadError && <div className="app-alert app-alert--danger" role="alert"><p>{loadError}</p><button className="button button--secondary" type="button" onClick={() => setReloadKey((current) => current + 1)}>Try again</button></div>}

            {!isLoading && !loadError && postsPage?.results.length === 0 && (
                <div className="empty-state"><Icon icon={penLineIcon} aria-hidden="true"/><h2>No posts yet</h2><p>Your first draft will appear here.</p><Link className="button button--primary" to="/dashboard/posts/new">Create your first post</Link></div>
            )}

            {!isLoading && !loadError && postsPage && postsPage.results.length > 0 && (
                <section className="dashboard-posts">
                    <div className="section-heading"><div><p className="section-eyebrow">Writing library</p><h2>{postsPage.count} {postsPage.count === 1 ? 'post' : 'posts'}</h2></div></div>
                    <div className="dashboard-post-list">
                        {postsPage.results.map((post) => (
                            <article className="dashboard-post" key={post.id}>
                                <div className="dashboard-post__icon"><Icon icon={post.status === 'removed' ? messageIcon : fileTextIcon} aria-hidden="true"/></div>
                                <div className="dashboard-post__body">
                                    <div className="dashboard-post__heading"><div><span className={`status-badge status-badge--${post.status}`}>{post.status.replace('_', ' ')}</span><h3>{post.title}</h3></div><div className="dashboard-post__actions"><Link className="button button--secondary button--small" to={`/dashboard/posts/${post.id}/edit`}><Icon icon={editIcon} aria-hidden="true"/>Edit</Link>{post.status === 'published' && <Link className="button button--secondary button--small" to={`/posts/${post.slug}`}><Icon icon={eyeIcon} aria-hidden="true"/>View</Link>}</div></div>
                                    <p className="dashboard-post__date">Updated {formatUpdatedDate(post.updated_at)}</p>
                                    {post.excerpt && <p className="dashboard-post__excerpt">{post.excerpt}</p>}
                                    {post.review_feedback && <div className="moderation-inline-feedback"><Icon icon={messageIcon} aria-hidden="true"/><div><strong>Moderation feedback:</strong><p>{post.review_feedback}</p><Link to={`/dashboard/posts/${post.id}/removed`}>Review next steps <Icon icon={arrowRightIcon} aria-hidden="true"/></Link></div></div>}
                                </div>
                            </article>
                        ))}
                    </div>

                    {(postsPage.previous || postsPage.next) && <nav className="pagination-bar" aria-label="Dashboard post pages"><button className="button button--secondary" type="button" disabled={postsPage.previous === null} onClick={() => setPage((current) => Math.max(1, current - 1))}><Icon icon={arrowLeftIcon} aria-hidden="true"/>Previous</button><span aria-live="polite">Page {page}</span><button className="button button--secondary" type="button" disabled={postsPage.next === null} onClick={() => setPage((current) => current + 1)}>Next<Icon icon={arrowRightIcon} aria-hidden="true"/></button></nav>}
                </section>
            )}

            <AuthorCommentsPanel/>
        </section>
    )
}
