import {Icon} from '@iconify/react'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import clockIcon from '@iconify-icons/lucide/clock-3'
import eyeIcon from '@iconify-icons/lucide/eye'
import flameIcon from '@iconify-icons/lucide/flame'
import graduationCapIcon from '@iconify-icons/lucide/graduation-cap'
import heartIcon from '@iconify-icons/lucide/heart'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import sparklesIcon from '@iconify-icons/lucide/sparkles'
import {useEffect, useState} from 'react'
import {Link} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {
    getPublishedPosts,
    type PaginatedResponse,
    type PublicPostListItem,
} from '../api/posts'
import {SavedPostButton} from '../components/SavedPostButton'
import {ThoughtHubIcon} from '../components/ThoughtHubIcon'
import {getTextDirection} from '../textDirection'

const publishedDateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
})

function formatPublishedDate(value: string): string {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
        ? value
        : publishedDateFormatter.format(date)
}

export function PublicPostsPage() {
    const [postsPage, setPostsPage] =
        useState<PaginatedResponse<PublicPostListItem> | null>(null)
    const [page, setPage] = useState(1)
    const [reloadKey, setReloadKey] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [discoveryMode, setDiscoveryMode] =
        useState<'newest' | 'viewed'>('newest')

    useEffect(() => {
        let isCancelled = false

        async function loadPosts() {
            setIsLoading(true)
            setLoadError(null)
            setPostsPage(null)

            try {
                const response = await getPublishedPosts({
                    page,
                    ...(discoveryMode === 'newest'
                        ? {}
                        : {ordering: discoveryMode}),
                })
                if (!isCancelled) setPostsPage(response)
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
                if (!isCancelled) setIsLoading(false)
            }
        }

        void loadPosts()
        return () => { isCancelled = true }
    }, [discoveryMode, page, reloadKey])

    const classificationsByKey = new Map<string, {
        name: string
        to: string
        type: 'Category' | 'Tag'
    }>()
    for (const post of postsPage?.results ?? []) {
        if (post.category) {
            classificationsByKey.set(
                `category:${post.category.slug}`,
                {
                    name: post.category.name,
                    to: `/categories/${post.category.slug}`,
                    type: 'Category',
                },
            )
        }
        for (const tag of post.tags) {
            classificationsByKey.set(`tag:${tag.slug}`, {
                name: `#${tag.name}`,
                to: `/tags/${tag.slug}`,
                type: 'Tag',
            })
        }
    }
    const classifications = Array.from(
        classificationsByKey.values(),
    ).slice(0, 6)

    return (
        <section className="home-page">
            <div className="app-shell">
                <header className="home-hero">
                    <div className="home-hero__copy">
                        <p className="section-eyebrow">
                            <Icon icon={graduationCapIcon} aria-hidden="true"/>
                            Built for university minds
                        </p>
                        <h1 className="visually-hidden">ThoughtHub</h1>
                        <p className="home-hero__heading">
                            Share your thoughts. Discover new perspectives.
                        </p>
                        <p className="home-hero__description">
                            A modern space for university students to publish ideas,
                            technology articles, campus experiences, and personal thoughts.
                        </p>
                        <div className="home-hero__actions">
                            <a className="button button--primary" href="#discover">
                                Explore posts
                                <Icon icon={arrowRightIcon} aria-hidden="true"/>
                            </a>
                            <Link
                                className="button button--secondary"
                                to="/dashboard/posts/new"
                            >
                                <Icon icon={penLineIcon} aria-hidden="true"/>
                                Start writing
                            </Link>
                        </div>
                    </div>

                    <div className="home-hero__visual" aria-hidden="true">
                        <div className="idea-orbit idea-orbit--one"><Icon icon={sparklesIcon}/><span>Ideas</span></div>
                        <div className="idea-orbit idea-orbit--two"><Icon icon={heartIcon}/><span>Perspectives</span></div>
                        <div className="idea-orbit idea-orbit--three"><Icon icon={flameIcon}/><span>Campus stories</span></div>
                        <div className="idea-core">
                            <ThoughtHubIcon className="idea-core__mark"/>
                            <small>Your voice belongs here</small>
                        </div>
                    </div>
                </header>
            </div>

            <section className="home-discovery" id="discover">
                <div className="app-shell">
                    <div className="section-heading section-heading--home">
                        <div>
                            <p className="section-eyebrow">Discover student writing</p>
                            <h2>Ideas worth opening</h2>
                        </div>
                        {postsPage && (
                            <span className="post-count">
                                {postsPage.count} {postsPage.count === 1 ? 'post' : 'posts'}
                            </span>
                        )}
                    </div>

                    <div className="discovery-tabs" aria-label="Sort published posts">
                        <button type="button" aria-pressed={discoveryMode === 'newest'} onClick={() => {setPage(1); setDiscoveryMode('newest')}}><Icon icon={clockIcon} aria-hidden="true"/>Newest</button>
                        <button type="button" aria-pressed={discoveryMode === 'viewed'} onClick={() => {setPage(1); setDiscoveryMode('viewed')}}><Icon icon={eyeIcon} aria-hidden="true"/>Most viewed</button>
                    </div>

                    {isLoading && (
                        <div className="content-state" role="status">
                            <span className="loading-ring" aria-hidden="true"/>
                            <p>Loading published posts…</p>
                        </div>
                    )}

                    {!isLoading && loadError && (
                        <div className="app-alert app-alert--danger" role="alert">
                            <p>{loadError}</p>
                            <button className="button button--secondary" type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
                        </div>
                    )}

                    {!isLoading && !loadError && postsPage?.results.length === 0 && (
                        <div className="empty-state">
                            <Icon icon={penLineIcon} aria-hidden="true"/>
                            <h2>No published posts yet</h2>
                            <p>Please check again later.</p>
                            <Link className="button button--primary" to="/dashboard/posts/new">Publish the first thought</Link>
                        </div>
                    )}

                    {!isLoading && !loadError && postsPage && postsPage.results.length > 0 && (
                        <>
                            <h3 className="visually-hidden">Latest posts</h3>
                            <div className="post-card-grid">
                                {postsPage.results.map((post, index) => (
                                    <article className={`post-card ${post.is_featured ? 'post-card--featured' : ''}`} key={post.id}>
                                        <div className="post-card__media">
                                            {post.featured_image ? (
                                                <img src={post.featured_image} alt={post.featured_image_alt} loading="lazy"/>
                                            ) : (
                                                <div className="post-card__placeholder"><span>{String(index + 1).padStart(2, '0')}</span><Icon icon={penLineIcon} aria-hidden="true"/></div>
                                            )}
                                        </div>
                                        <div className="post-card__body">
                                            <div className="post-card__topline">
                                                {post.category ? <Link className="content-label" to={`/categories/${post.category.slug}`}>{post.category.name}</Link> : <span className="content-label">{post.post_type}</span>}
                                                <SavedPostButton post={{slug: post.slug, title: post.title, excerpt: post.excerpt, author: post.author_username ?? 'Deleted user', category: post.category?.name ?? post.post_type, readingTime: post.reading_time}}/>
                                            </div>
                                            <h3 dir={getTextDirection(post.title)}><Link to={`/posts/${post.slug}`}>{post.title}</Link></h3>
                                            {post.excerpt && <p dir={getTextDirection(post.excerpt)}>{post.excerpt}</p>}
                                            <div className="post-card__tag-slot">
                                                {post.tags.length > 0 && <div className="post-tags">{post.tags.map((tag) => <Link to={`/tags/${tag.slug}`} key={tag.id}>#{tag.name}</Link>)}</div>}
                                            </div>
                                            <div className="post-card__meta">
                                                <span>By {post.author_username ?? 'Deleted user'}</span>
                                                <span><time dateTime={post.published_at}>{formatPublishedDate(post.published_at)}</time> · {post.reading_time} min read</span>
                                                <span>{post.views} {post.views === 1 ? 'view' : 'views'} · {post.comments} {post.comments === 1 ? 'comment' : 'comments'}</span>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {(postsPage.previous || postsPage.next) && (
                                <nav className="pagination-bar" aria-label="Published post pages">
                                    <button className="button button--secondary" type="button" disabled={postsPage.previous === null} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                                    <span aria-live="polite">Page {page}</span>
                                    <button className="button button--secondary" type="button" disabled={postsPage.next === null} onClick={() => setPage((current) => current + 1)}>Next</button>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </section>

            <section className="home-classifications">
                <div className="app-shell">
                    <div className="section-heading">
                        <div><p className="section-eyebrow">How posts are organized</p><h2>Explore categories and tags</h2></div>
                        <Link className="quiet-link" to="/categories">View all <Icon icon={arrowRightIcon} aria-hidden="true"/></Link>
                    </div>
                    {classifications.length > 0 && <div className="classification-link-grid">
                        {classifications.map((classification, index) => (
                            <Link to={classification.to} key={classification.to}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{classification.name}</strong><small>{classification.type}</small></div><Icon icon={arrowRightIcon} aria-hidden="true"/></Link>
                        ))}
                    </div>}
                </div>
            </section>

            <section className="home-writing-cta">
                <div className="app-shell home-writing-cta__inner">
                    <div><p className="section-eyebrow">Your perspective matters</p><h2>Turn the thought in your notes into something others can discover.</h2></div>
                    <Link className="button button--primary" to="/dashboard/posts/new">Start writing <Icon icon={arrowRightIcon} aria-hidden="true"/></Link>
                </div>
            </section>
        </section>
    )
}
