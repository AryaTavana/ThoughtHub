import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import bookmarkIcon from '@iconify-icons/lucide/bookmark'
import checkIcon from '@iconify-icons/lucide/check'
import codeIcon from '@iconify-icons/lucide/code-2'
import compassIcon from '@iconify-icons/lucide/compass'
import cpuIcon from '@iconify-icons/lucide/cpu'
import graduationCapIcon from '@iconify-icons/lucide/graduation-cap'
import keyRoundIcon from '@iconify-icons/lucide/key-round'
import lifeBuoyIcon from '@iconify-icons/lucide/life-buoy'
import lockIcon from '@iconify-icons/lucide/lock-keyhole'
import mailIcon from '@iconify-icons/lucide/mail'
import messageIcon from '@iconify-icons/lucide/message-circle'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import searchIcon from '@iconify-icons/lucide/search'
import shieldCheckIcon from '@iconify-icons/lucide/shield-check'
import tagIcon from '@iconify-icons/lucide/tag'
import userIcon from '@iconify-icons/lucide/user'
import usersIcon from '@iconify-icons/lucide/users'
import wifiOffIcon from '@iconify-icons/lucide/wifi-off'
import {useEffect, useState, type FormEvent} from 'react'
import {Link, Navigate, useParams, useSearchParams} from 'react-router-dom'

import {
    confirmPasswordReset,
    getPublicUserProfile,
    requestPasswordReset,
    type PublicUserProfile,
} from '../api/auth'
import {ApiError} from '../api/client'
import {getApiErrorMessage, getApiFieldErrors} from '../api/errors'
import {
    getCategories,
    getAuthorPost,
    getPublishedPosts,
    getTags,
    type AuthorPostDetail,
    type Category,
    type PublicPostListItem,
    type Tag,
} from '../api/posts'
import {useAuth} from '../auth/useAuth'
import {SavedPostButton} from '../components/SavedPostButton'
import {
    applyTheme,
    getActiveTheme,
    THEME_CHANGE_EVENT,
    type Theme,
} from '../theme'
import {useSavedPosts} from '../useSavedPosts'
import {useNotifications} from '../useNotifications'

const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'})

function formatDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function LoadingState({label}: {label: string}) {
    return <div className="content-state" role="status"><span className="loading-ring" aria-hidden="true"/><p>{label}</p></div>
}

function PostRows({posts}: {posts: PublicPostListItem[]}) {
    return (
        <div className="post-row-list">
            {posts.map((post) => (
                <article className="post-row" key={post.id}>
                    <div className="post-row__content">
                        <div className="post-row__topline">
                            {post.category ? (
                                <Link
                                    className="content-label"
                                    to={`/categories/${post.category.slug}`}
                                >
                                    {post.category.name}
                                </Link>
                            ) : (
                                <span className="content-label">{post.post_type}</span>
                            )}
                            <SavedPostButton
                                post={{
                                    slug: post.slug,
                                    title: post.title,
                                    excerpt: post.excerpt,
                                    author: post.author_username ?? 'Deleted user',
                                    category: post.category?.name ?? post.post_type,
                                    readingTime: post.reading_time,
                                }}
                            />
                        </div>
                        <h2><Link to={`/posts/${post.slug}`}>{post.title}</Link></h2>
                        {post.excerpt && <p>{post.excerpt}</p>}
                        <div className="post-meta-line">
                            <span>By {post.author_username ?? 'Deleted user'}</span>
                            <span>{post.reading_time} min read</span>
                            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    )
}

export function PublicProfilePage() {
    const {username = ''} = useParams<{username: string}>()
    const {user} = useAuth()
    const [profile, setProfile] = useState<PublicUserProfile | null>(null)
    const [postsPage, setPostsPage] = useState<Awaited<ReturnType<typeof getPublishedPosts>> | null>(null)
    const [pageState, setPageState] = useState({username, page: 1})
    const [isLoading, setIsLoading] = useState(true)
    const [isNotFound, setIsNotFound] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const page = pageState.username === username ? pageState.page : 1

    useEffect(() => {
        let cancelled = false

        async function loadProfile() {
            setIsLoading(true)
            setIsNotFound(false)
            setError(null)
            setProfile(null)
            setPostsPage(null)

            try {
                const [profileResponse, postsResponse] = await Promise.all([
                    getPublicUserProfile(username),
                    getPublishedPosts({author: username, page}),
                ])
                if (!cancelled) {
                    setProfile(profileResponse)
                    setPostsPage(postsResponse)
                }
            } catch (loadError) {
                if (cancelled) return
                if (loadError instanceof ApiError && loadError.status === 404) {
                    setIsNotFound(true)
                    setProfile(null)
                    setPostsPage(null)
                } else {
                    setError(getApiErrorMessage(loadError, 'Unable to load this profile.'))
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        void loadProfile()
        return () => { cancelled = true }
    }, [page, username])

    const isOwnProfile = user?.username === username
    const displayName = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
        : username
    const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

    if (isLoading && !profile) {
        return <section className="app-shell community-page"><LoadingState label="Loading this student’s profile…"/></section>
    }

    if (isNotFound) {
        return <section className="app-shell community-page"><div className="empty-state"><Icon icon={userIcon} aria-hidden="true"/><h1>Profile not found</h1><p>No active ThoughtHub account uses this username.</p><Link className="button button--primary" to="/">Explore posts</Link></div></section>
    }

    if (error || !profile || !postsPage) {
        return <section className="app-shell community-page"><div className="app-alert app-alert--danger" role="alert">{error ?? 'Unable to load this profile.'}</div></section>
    }

    return (
        <section className="app-shell community-page profile-page">
            <header className="profile-hero">
                <div className="profile-avatar" aria-hidden="true">{initials || 'TH'}</div>
                <div className="profile-hero__content">
                    <div className="page-heading-with-action">
                        <div>
                            <h1>{displayName}</h1>
                            <p className="profile-handle">@{username}</p>
                        </div>
                        {isOwnProfile && <Link className="button button--secondary" to="/settings">Edit profile</Link>}
                    </div>
                    <p className="profile-bio">A ThoughtHub author sharing ideas and useful perspectives with the community.</p>
                    <div className="profile-details">
                        <span><Icon icon={graduationCapIcon} aria-hidden="true"/> ThoughtHub author</span>
                        <span><Icon icon={penLineIcon} aria-hidden="true"/> {profile.published_posts_count} published {profile.published_posts_count === 1 ? 'post' : 'posts'}</span>
                    </div>
                </div>
            </header>

            <div className="profile-stats" aria-label="Profile activity">
                <div><strong>{profile.published_posts_count}</strong><span>Posts</span></div>
                <div><strong>{profile.total_reading_time}</strong><span>Minutes of reading</span></div>
                <div><strong>{profile.categories_count}</strong><span>Categories</span></div>
                <div><strong>{profile.tags_count}</strong><span>Tags</span></div>
            </div>

            <div className="section-heading"><div><p className="section-eyebrow">Latest writing</p><h2>Posts by {displayName}</h2></div></div>
            {postsPage.results.length > 0 ? <><PostRows posts={postsPage.results}/>{(postsPage.previous || postsPage.next) && <nav className="pagination-bar" aria-label="Profile post pages"><button className="button button--secondary" type="button" disabled={!postsPage.previous} onClick={() => setPageState({username, page: Math.max(1, page - 1)})}>Previous</button><span>Page {page}</span><button className="button button--secondary" type="button" disabled={!postsPage.next} onClick={() => setPageState({username, page: page + 1})}>Next</button></nav>}</> : (
                <div className="empty-state"><Icon icon={penLineIcon} aria-hidden="true"/><h2>No published posts yet</h2><p>When {displayName} publishes a thought, it will appear here.</p>{isOwnProfile && <Link className="button button--primary" to="/dashboard/posts/new">Write your first post</Link>}</div>
            )}
        </section>
    )
}

type ClassificationKind = 'category' | 'tag'

function ClassificationPage({kind}: {kind: ClassificationKind}) {
    const parameters = useParams<{category?: string; tag?: string}>()
    const slug = parameters[kind] ?? ''
    const [postsPage, setPostsPage] = useState<Awaited<ReturnType<typeof getPublishedPosts>> | null>(null)
    const [classification, setClassification] = useState<Category | Tag | null>(null)
    const [pageState, setPageState] = useState({slug, page: 1})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const page = pageState.slug === slug ? pageState.page : 1
    const label = classification?.name ?? slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
    const kindLabel = kind === 'category' ? 'Category' : 'Tag'

    useEffect(() => {
        let cancelled = false

        async function loadClassification() {
            setIsLoading(true)
            setError(null)
            setPostsPage(null)
            setClassification(null)
            try {
                const [postsResponse, choices] = await Promise.all([
                    getPublishedPosts({
                        page,
                        ...(kind === 'category'
                            ? {category: slug}
                            : {tag: slug}),
                    }),
                    kind === 'category' ? getCategories() : getTags(),
                ])
                if (!cancelled) {
                    setPostsPage(postsResponse)
                    setClassification(
                        choices.find((choice) => choice.slug === slug) ?? null,
                    )
                }
            } catch (loadError) {
                if (!cancelled) setError(getApiErrorMessage(loadError, `Unable to load this ${kind}.`))
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        void loadClassification()
        return () => { cancelled = true }
    }, [kind, page, slug])

    return (
        <section className="app-shell community-page classification-page">
            <header className="classification-hero">
                <div className="classification-hero__icon"><Icon icon={kind === 'category' ? cpuIcon : tagIcon} aria-hidden="true"/></div>
                <div><p className="section-eyebrow">{kindLabel}</p><h1>{label}</h1><p>{kind === 'category' && classification && 'description' in classification && classification.description ? classification.description : `Published posts filed under this ${kind}.`}</p><div className="classification-hero__meta"><span>{postsPage?.count ?? 0} matching posts</span><span>Updated with the latest writing</span></div></div>
            </header>
            <div className="content-toolbar"><p>Newest matching posts</p><Link to="/categories" className="quiet-link"><Icon icon={arrowLeftIcon} aria-hidden="true"/> All categories and tags</Link></div>
            {isLoading && !postsPage ? <LoadingState label={`Loading ${kind} posts…`}/> : error ? <div className="app-alert app-alert--danger" role="alert">{error}</div> : !classification ? <div className="empty-state"><Icon icon={searchIcon} aria-hidden="true"/><h2>{kindLabel} not found</h2><p>This {kind} does not exist in the backend catalogue.</p><Link className="button button--secondary" to="/categories">Browse categories and tags</Link></div> : postsPage && postsPage.results.length > 0 ? <><PostRows posts={postsPage.results}/>{(postsPage.previous || postsPage.next) && <nav className="pagination-bar" aria-label={`${kindLabel} post pages`}><button className="button button--secondary" type="button" disabled={!postsPage.previous} onClick={() => setPageState({slug, page: Math.max(1, page - 1)})}>Previous</button><span>Page {page}</span><button className="button button--secondary" type="button" disabled={!postsPage.next} onClick={() => setPageState({slug, page: page + 1})}>Next</button></nav>}</> : <div className="empty-state"><Icon icon={searchIcon} aria-hidden="true"/><h2>No posts in this {kind}</h2><p>Browse another category or tag, or search all published writing.</p><Link className="button button--secondary" to="/search">Search ThoughtHub</Link></div>}
        </section>
    )
}

export function CategoryPage() {
    return <ClassificationPage kind="category"/>
}

export function TagPage() {
    return <ClassificationPage kind="tag"/>
}

export function CategoriesTagsPage() {
    const [classifications, setClassifications] = useState<{
        categories: Category[]
        tags: Tag[]
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function loadClassifications() {
            setError(null)
            try {
                const [categories, tags] = await Promise.all([
                    getCategories(),
                    getTags(),
                ])
                if (!cancelled) setClassifications({categories, tags})
            } catch (loadError) {
                if (!cancelled) {
                    setError(getApiErrorMessage(loadError, 'Unable to load categories and tags.'))
                }
            }
        }

        void loadClassifications()
        return () => { cancelled = true }
    }, [])

    return (
        <section className="app-shell community-page classifications-index-page">
            <header className="page-intro"><div><p className="section-eyebrow">Explore ThoughtHub</p><h1>Categories and tags</h1><p>Browse the same categories and tags authors select when publishing.</p></div></header>
            {!classifications && !error && <LoadingState label="Loading categories and tags…"/>}
            {error && <div className="app-alert app-alert--danger" role="alert">{error}</div>}
            {classifications && <>
                <section className="classification-index-section"><div className="section-heading"><div><p className="section-eyebrow">Broad subjects</p><h2>Categories</h2></div><span className="post-count">{classifications.categories.length} {classifications.categories.length === 1 ? 'category' : 'categories'}</span></div><div className="classification-link-grid">{classifications.categories.map((category, index) => <Link to={`/categories/${category.slug}`} key={category.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{category.name}</strong>{category.description && <small>{category.description}</small>}</div><Icon icon={arrowRightIcon} aria-hidden="true"/></Link>)}</div></section>
                <section className="classification-index-section"><div className="section-heading"><div><p className="section-eyebrow">Specific ideas</p><h2>Tags</h2></div><span className="post-count">{classifications.tags.length} {classifications.tags.length === 1 ? 'tag' : 'tags'}</span></div><div className="classification-link-grid">{classifications.tags.map((tag, index) => <Link to={`/tags/${tag.slug}`} key={tag.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>#{tag.name}</strong></div><Icon icon={arrowRightIcon} aria-hidden="true"/></Link>)}</div></section>
            </>}
        </section>
    )
}

export function SearchPage() {
    const [searchParameters, setSearchParameters] = useSearchParams()
    const query = searchParameters.get('q') ?? ''
    const [input, setInput] = useState(query)
    const [page, setPage] = useState(1)
    const [resultsPage, setResultsPage] =
        useState<Awaited<ReturnType<typeof getPublishedPosts>> | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setInput(query)
            setPage(1)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [query])

    useEffect(() => {
        const nextQuery = input.trim()
        if (nextQuery === query) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            setSearchParameters(nextQuery ? {q: nextQuery} : {}, {
                replace: true,
            })
        }, 300)

        return () => window.clearTimeout(timeoutId)
    }, [input, query, setSearchParameters])

    useEffect(() => {
        let cancelled = false

        async function loadSearchResults() {
            setIsLoading(true)
            setError(null)

            try {
                const response = await getPublishedPosts({
                    page,
                    search: query,
                })
                if (!cancelled) {
                    setResultsPage(response)
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        getApiErrorMessage(
                            loadError,
                            'Unable to search ThoughtHub.',
                        ),
                    )
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadSearchResults()

        return () => {
            cancelled = true
        }
    }, [page, query])

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const next = input.trim()
        setSearchParameters(next ? {q: next} : {}, {replace: true})
    }

    const results = resultsPage?.results ?? []
    const resultCount = resultsPage?.count ?? 0

    return (
        <section className="app-shell community-page search-page">
            <header className="page-intro"><div><p className="section-eyebrow">Search ThoughtHub</p><h1>Find an idea worth reading.</h1></div></header>
            <form className="search-page__form" role="search" onSubmit={handleSubmit}><Icon icon={searchIcon} aria-hidden="true"/><label className="visually-hidden" htmlFor="thought-search">Search published posts by title, author, category, or tag</label><input id="thought-search" type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search titles, authors, categories, and tags"/><span className="search-page__live-status" aria-live="polite">{isLoading ? 'Searching…' : 'Live results'}</span></form>
            <div className="search-page__summary"><p><strong>{resultCount} {resultCount === 1 ? 'result' : 'results'}</strong>{query && <> for “{query}”</>}</p><div className="segmented-control"><span>Published posts</span><Link to="/categories">Browse categories and tags</Link></div></div>
            {isLoading && !resultsPage ? <LoadingState label="Searching ThoughtHub…"/> : error ? <div className="app-alert app-alert--danger" role="alert">{error}</div> : results.length > 0 ? <><PostRows posts={results}/>{(resultsPage?.previous || resultsPage?.next) && <nav className="pagination-bar" aria-label="Search result pages"><button className="button button--secondary" type="button" disabled={!resultsPage.previous} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page}</span><button className="button button--secondary" type="button" disabled={!resultsPage.next} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}</> : <div className="empty-state"><Icon icon={searchIcon} aria-hidden="true"/><h2>No results yet</h2><p>Try a shorter phrase, check the spelling, or browse categories and tags instead.</p><Link className="button button--secondary" to="/categories">Browse categories and tags</Link></div>}
        </section>
    )
}

export function SavedPostsPage() {
    const {savedPosts, isLoading, error} = useSavedPosts()

    return (
        <section className="app-shell community-page saved-page">
            <header className="page-intro"><div><p className="section-eyebrow">Your reading list</p><h1>Saved posts</h1><p>Saved to your ThoughtHub account and available on every device.</p></div></header>
            {isLoading ? <LoadingState label="Loading your saved posts…"/> : error ? <div className="app-alert app-alert--danger" role="alert">{error}</div> : savedPosts.length === 0 ? <div className="empty-state"><Icon icon={bookmarkIcon} aria-hidden="true"/><h2>No saved posts yet</h2><p>Use the Save action on any post to build your personal reading list.</p><Link className="button button--primary" to="/">Explore posts</Link></div> : (
                <div className="saved-post-grid">{savedPosts.map(({post}) => <article className="saved-post-card" key={post.slug}><div className="saved-post-card__visual"><Icon icon={codeIcon} aria-hidden="true"/></div><div><span className="content-label">{post.category?.name ?? post.post_type}</span><h2><Link to={`/posts/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div className="post-meta-line"><span>By {post.author_username ?? 'Deleted user'}</span><span>{post.reading_time} min read</span></div><SavedPostButton post={{slug: post.slug, title: post.title, excerpt: post.excerpt, author: post.author_username ?? 'Deleted user', category: post.category?.name ?? post.post_type, readingTime: post.reading_time}}/></div></article>)}</div>
            )}
        </section>
    )
}

export function NotificationsPage() {
    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        markRead,
        markAllRead,
    } = useNotifications()
    const [actionError, setActionError] = useState<string | null>(null)

    async function handleMarkRead(notificationId: number) {
        setActionError(null)
        try {
            await markRead(notificationId)
        } catch (markError) {
            setActionError(
                getApiErrorMessage(
                    markError,
                    'Unable to update this notification.',
                ),
            )
        }
    }

    async function handleMarkAllRead() {
        setActionError(null)
        try {
            await markAllRead()
        } catch (markError) {
            setActionError(
                getApiErrorMessage(
                    markError,
                    'Unable to update notifications.',
                ),
            )
        }
    }

    return (
        <section className="app-shell community-page notifications-page">
            <header className="page-intro"><div><p className="section-eyebrow">Your activity</p><h1>Notifications</h1><p>New comments and important moderation feedback from your account.</p></div>{unreadCount > 0 && <button className="button button--secondary" type="button" onClick={() => void handleMarkAllRead()}>Mark all as read</button>}</header>
            {(error || actionError) && <div className="app-alert app-alert--danger" role="alert">{error ?? actionError}</div>}
            {isLoading ? <LoadingState label="Loading notifications…"/> : notifications.length === 0 ? <div className="empty-state empty-state--compact"><Icon icon={checkIcon} aria-hidden="true"/><h2>You are all caught up</h2><p>New comments and moderation feedback will appear here automatically.</p><Link className="button button--secondary" to="/dashboard">Open dashboard</Link></div> : <ul className="notification-list">{notifications.map((notification) => <li className={`notification-card ${notification.is_read ? '' : 'notification-card--unread'}`} key={notification.id}><div className="notification-card__icon"><Icon icon={notification.kind === 'new_comment' ? messageIcon : shieldCheckIcon} aria-hidden="true"/></div><div className="notification-card__content"><div className="notification-card__meta"><span>{notification.kind.replaceAll('_', ' ')}</span><time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time></div><h2>{notification.title}</h2><p>{notification.message}</p><div className="notification-card__actions"><Link to={notification.target_url} onClick={() => void handleMarkRead(notification.id)}>View activity <Icon icon={arrowRightIcon} aria-hidden="true"/></Link>{!notification.is_read && <button type="button" onClick={() => void handleMarkRead(notification.id)}>Mark as read</button>}</div></div></li>)}</ul>}
        </section>
    )
}

type SettingsTab = 'profile' | 'appearance'

export function SettingsPage() {
    const {user, updateProfile} = useAuth()
    const [tab, setTab] = useState<SettingsTab>('profile')
    const [theme, setTheme] = useState<Theme>(getActiveTheme)
    const [feedback, setFeedback] = useState('')
    const [profileData, setProfileData] = useState(() => ({
        email: user?.email ?? '',
        first_name: user?.first_name ?? '',
        last_name: user?.last_name ?? '',
    }))
    const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({})
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        function syncTheme(event: Event) {
            setTheme((event as CustomEvent<Theme>).detail)
        }

        window.addEventListener(THEME_CHANGE_EVENT, syncTheme)
        return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme)
    }, [])

    if (!user) return <Navigate to="/login" replace/>

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSaving(true)
        setFeedback('')
        setProfileErrors({})

        try {
            await updateProfile(profileData)
            setFeedback('Your profile has been updated.')
        } catch (saveError) {
            const fieldErrors = getApiFieldErrors(saveError)
            setProfileErrors(fieldErrors)
            if (Object.keys(fieldErrors).length === 0) {
                setFeedback(getApiErrorMessage(saveError, 'Unable to update your profile.'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="app-shell community-page settings-page">
            <header className="page-intro"><div><p className="section-eyebrow">Your account</p><h1>Settings</h1><p>Manage how you appear and how ThoughtHub works for you.</p></div></header>
            <div className="settings-layout">
                <aside className="settings-nav" aria-label="Settings sections">
                    <button type="button" aria-pressed={tab === 'profile'} onClick={() => {setTab('profile'); setFeedback('')}}><Icon icon={userIcon} aria-hidden="true"/>Profile</button>
                    <button type="button" aria-pressed={tab === 'appearance'} onClick={() => {setTab('appearance'); setFeedback('')}}><Icon icon={compassIcon} aria-hidden="true"/>Appearance</button>
                </aside>
                <div className="settings-panel">
                    {tab === 'profile' && <><div className="settings-panel__heading"><div><h2>Public profile</h2><p>Update the name and email connected to your account.</p></div></div><div className="profile-account-summary"><div className="profile-avatar" aria-hidden="true">{`${user.first_name[0] ?? ''}${user.last_name[0] ?? user.username[0]}`.toUpperCase()}</div><div><strong>{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}</strong><span>@{user.username}</span><span>{user.email}</span></div></div><form className="settings-profile-form" onSubmit={saveProfile}><label className="field"><span>First name</span><input type="text" name="first_name" autoComplete="given-name" value={profileData.first_name} maxLength={150} disabled={isSaving} onChange={(event) => {setProfileData((current) => ({...current, first_name: event.target.value})); setProfileErrors((current) => ({...current, first_name: []}))}}/>{profileErrors.first_name?.[0] && <small className="field-error">{profileErrors.first_name[0]}</small>}</label><label className="field"><span>Last name</span><input type="text" name="last_name" autoComplete="family-name" value={profileData.last_name} maxLength={150} disabled={isSaving} onChange={(event) => {setProfileData((current) => ({...current, last_name: event.target.value})); setProfileErrors((current) => ({...current, last_name: []}))}}/>{profileErrors.last_name?.[0] && <small className="field-error">{profileErrors.last_name[0]}</small>}</label><label className="field"><span>Email address</span><input type="email" name="email" autoComplete="email" value={profileData.email} required disabled={isSaving} onChange={(event) => {setProfileData((current) => ({...current, email: event.target.value})); setProfileErrors((current) => ({...current, email: []}))}}/>{profileErrors.email?.[0] && <small className="field-error">{profileErrors.email[0]}</small>}</label><div className="system-state-page__actions"><button className="button button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</button><Link className="button button--secondary" to={`/profile/${user.username}`}>View public profile</Link></div></form></>}
                    {tab === 'appearance' && <><div className="settings-panel__heading"><div><h2>Appearance</h2><p>Choose the theme that is easiest for you to read.</p></div></div><fieldset className="theme-options"><legend>Theme preference</legend><label><input type="radio" name="theme" checked={theme === 'light'} onChange={() => applyTheme('light')}/><span><strong>Light</strong><small>Use a light background and dark text.</small></span></label><label><input type="radio" name="theme" checked={theme === 'dark'} onChange={() => applyTheme('dark')}/><span><strong>Dark</strong><small>Use a dark background and light text.</small></span></label></fieldset><p className="settings-inline-note">Theme changes apply immediately and are saved on this device.</p></>}
                    <p className="form-feedback" role="status">{feedback}</p>
                </div>
            </div>
        </section>
    )
}

export function CommunityGuidelinesPage() {
    return (
        <section className="app-shell community-page document-page">
            <header className="document-hero"><p className="section-eyebrow">ThoughtHub community</p><h1>Write freely. Treat people carefully.</h1><p>These guidelines keep ThoughtHub open to honest student ideas while protecting the people behind them.</p><span>Last updated August 2026</span></header>
            <div className="document-layout"><aside><strong>On this page</strong><a href="#principles">Our principles</a><a href="#publish">What you can publish</a><a href="#remove">When content is removed</a><a href="#feedback">Feedback and revision</a></aside><div className="document-content">
                <section id="principles"><span>01</span><h2>Our principles</h2><p>ThoughtHub is built for curiosity, honest experience, and useful disagreement. Students can publish immediately without waiting for approval.</p><div className="principle-grid"><div><Icon icon={messageIcon} aria-hidden="true"/><h3>Be human</h3><p>Write to people, not at them.</p></div><div><Icon icon={penLineIcon} aria-hidden="true"/><h3>Be original</h3><p>Share your thinking and credit sources.</p></div><div><Icon icon={shieldCheckIcon} aria-hidden="true"/><h3>Be responsible</h3><p>Protect privacy and avoid harm.</p></div></div></section>
                <section id="publish"><span>02</span><h2>What you can publish</h2><p>Technology notes, tutorials, campus experiences, opinions, project stories, creative work, and personal reflections are welcome.</p><ul><li>Make it clear when something is your opinion.</li><li>Credit quotations, research, images, and borrowed ideas.</li><li>Ask permission before sharing another person’s private story.</li><li>Disagree with ideas without attacking the person.</li></ul></section>
                <section id="remove"><span>03</span><h2>When content is removed</h2><p>Administrators may remove posts or comments containing harassment, private information, impersonation, dangerous instructions, spam, or copied work presented as original.</p><div className="document-note"><Icon icon={shieldCheckIcon} aria-hidden="true"/><p>Removal does not lock the author out. The author receives a reason and can revise and immediately republish after fixing the issue.</p></div></section>
                <section id="feedback"><span>04</span><h2>Feedback and revision</h2><p>Moderation feedback should identify the problem, explain the relevant guideline, and suggest what the author can change. It should never shame the student.</p></section>
            </div></div>
        </section>
    )
}

export function HelpCenterPage() {
    const [query, setQuery] = useState('')
    const categories = [
        {icon: penLineIcon, title: 'Writing and publishing', text: 'Create posts, use content blocks, save drafts, and publish.'},
        {icon: userIcon, title: 'Account and profile', text: 'Sign in, reset a password, and understand your public profile.'},
        {icon: shieldCheckIcon, title: 'Moderation and feedback', text: 'Understand removals, feedback, and how to revise content.'},
        {icon: usersIcon, title: 'Comments and community', text: 'Join discussions and manage your contributions.'},
    ]
    const questions = [
        {question: 'Does my post need approval before publishing?', answer: 'No. Posts and comments publish immediately. Administrators can remove content later if it breaks the community guidelines.'},
        {question: 'Can I republish a removed post?', answer: 'Yes. Open the moderation feedback, revise the issue, and republish immediately.'},
        {question: 'Why can’t I sign in?', answer: 'Check your username and password first. If you forgot your password, request a secure reset link from the sign-in page.'},
        {question: 'Where can I see moderation feedback?', answer: 'Your dashboard shows feedback beside removed posts and comments.'},
    ]
    const normalizedQuery = query.trim().toLowerCase()
    const matchingCategories = categories.filter((category) =>
        `${category.title} ${category.text}`.toLowerCase().includes(normalizedQuery),
    )
    const matchingQuestions = questions.filter((question) =>
        `${question.question} ${question.answer}`.toLowerCase().includes(normalizedQuery),
    )

    return (
        <section className="app-shell community-page help-page">
            <header className="help-hero"><p className="section-eyebrow">Help center</p><h1>What can we help with?</h1><label><Icon icon={searchIcon} aria-hidden="true"/><span className="visually-hidden">Search help articles</span><input type="search" placeholder="Search help articles" value={query} onChange={(event) => setQuery(event.target.value)}/></label></header>
            {matchingCategories.length > 0 && <div className="help-category-grid">{matchingCategories.map((category) => <article key={category.title}><Icon icon={category.icon} aria-hidden="true"/><div><h2>{category.title}</h2><p>{category.text}</p></div></article>)}</div>}
            <section className="faq-section"><div className="section-heading"><div><p className="section-eyebrow">Quick answers</p><h2>{normalizedQuery ? 'Matching help' : 'Frequently asked'}</h2></div></div>{matchingQuestions.map((question, index) => <details open={normalizedQuery ? true : index === 0} key={question.question}><summary>{question.question}</summary><p>{question.answer}</p></details>)}{matchingCategories.length === 0 && matchingQuestions.length === 0 && <div className="empty-state empty-state--compact"><Icon icon={searchIcon} aria-hidden="true"/><h2>No help articles matched</h2><p>Try a broader word such as “password,” “post,” or “comments.”</p></div>}</section>
            <div className="support-strip"><div><Icon icon={lifeBuoyIcon} aria-hidden="true"/><span><strong>Need more context?</strong><small>Review the rules that guide publishing and moderation.</small></span></div><Link className="button button--primary" to="/guidelines">Read the guidelines</Link></div>
        </section>
    )
}

export function PasswordRecoveryPage() {
    const {uid, token} = useParams<{uid?: string; token?: string}>()
    const {isInitializing} = useAuth()
    const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'complete'>(() => uid && token ? 'reset' : 'request')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function requestReset(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!email.trim() || !email.includes('@')) { setError('Enter a complete email address.'); return }
        setError('')
        setIsSubmitting(true)
        try {
            await requestPasswordReset(email.trim())
            setStep('sent')
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to request a password reset.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    async function updatePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (password.length < 8) { setError('Use at least 8 characters.'); return }
        if (password !== confirm) { setError('The passwords do not match.'); return }
        if (!uid || !token) { setError('This password reset link is incomplete.'); return }
        setError('')
        setIsSubmitting(true)
        try {
            await confirmPasswordReset({
                uid,
                token,
                new_password: password,
                new_password_confirm: confirm,
            })
            setStep('complete')
        } catch (confirmationError) {
            setError(getApiErrorMessage(confirmationError, 'Unable to update your password.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="app-shell community-page recovery-page">
            <aside className="recovery-journey"><p className="section-eyebrow">Account recovery</p><h1>A clear way back to your account.</h1><p>We will guide you through each step and never ask for your current password.</p><ol><li data-active={step === 'request'} data-complete={step !== 'request'}><span>1</span><div><strong>Find your account</strong><small>Enter your ThoughtHub email.</small></div></li><li data-active={step === 'sent'} data-complete={step === 'reset' || step === 'complete'}><span>2</span><div><strong>Check your email</strong><small>Open the secure reset link.</small></div></li><li data-active={step === 'reset'} data-complete={step === 'complete'}><span>3</span><div><strong>Create a password</strong><small>Choose a fresh password.</small></div></li></ol></aside>
            <div className="recovery-panel">
                {step === 'request' && <><div className="panel-icon"><Icon icon={keyRoundIcon} aria-hidden="true"/></div><p className="section-eyebrow">Step 1 of 3</p><h2>Forgot your password?</h2><p>Enter your account email to receive a one-use reset link.</p>{error && <div className="app-alert app-alert--danger" role="alert">{error}</div>}<form onSubmit={requestReset}><label className="field"><span>Email address</span><div className="field-control"><Icon icon={mailIcon} aria-hidden="true"/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required disabled={isSubmitting || isInitializing}/></div></label><button className="button button--primary button--block" type="submit" disabled={isSubmitting || isInitializing}>{isInitializing ? 'Preparing secure form…' : isSubmitting ? 'Sending…' : 'Send reset link'} {!isSubmitting && !isInitializing && <Icon icon={arrowRightIcon} aria-hidden="true"/>}</button></form><p className="panel-bottom-link">Remembered it? <Link to="/login">Return to sign in</Link></p></>}
                {step === 'sent' && <><div className="panel-icon"><Icon icon={mailIcon} aria-hidden="true"/></div><p className="section-eyebrow">Step 2 of 3</p><h2>Check your inbox</h2><p>If an active ThoughtHub account uses <strong>{email}</strong>, it will receive a one-use reset link.</p><button className="quiet-button" type="button" onClick={() => setStep('request')}><Icon icon={arrowLeftIcon} aria-hidden="true"/>Use a different email</button></>}
                {step === 'reset' && <><div className="panel-icon"><Icon icon={lockIcon} aria-hidden="true"/></div><p className="section-eyebrow">Step 3 of 3</p><h2>Create a new password</h2><p>Choose something memorable that you have not used before.</p>{error && <div className="app-alert app-alert--danger" role="alert">{error}</div>}<form onSubmit={updatePassword}><label className="field"><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required disabled={isSubmitting || isInitializing}/></label><label className="field"><span>Confirm new password</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required disabled={isSubmitting || isInitializing}/></label><button className="button button--primary button--block" type="submit" disabled={isSubmitting || isInitializing}>{isInitializing ? 'Preparing secure form…' : isSubmitting ? 'Updating…' : 'Update password'}</button></form></>}
                {step === 'complete' && <div className="recovery-complete"><div className="panel-icon"><Icon icon={checkIcon} aria-hidden="true"/></div><p className="section-eyebrow">Password updated</p><h2>Your new password is ready</h2><p>You can now sign in with the password you just created.</p><Link className="button button--primary button--block" to="/login">Continue to sign in</Link></div>}
            </div>
        </section>
    )
}

export function ModerationPage() {
    const {user} = useAuth()
    if (!user) return <Navigate to="/login" replace/>
    if (!user.is_staff) return <Navigate to="/dashboard" replace/>

    return (
        <section className="app-shell community-page moderation-page">
            <header className="page-intro"><div><p className="section-eyebrow">Administrator</p><h1>Moderation</h1><p>ThoughtHub already connects moderation actions through Django Admin.</p></div></header>
            <div className="moderation-overview"><div><Icon icon={shieldCheckIcon} aria-hidden="true"/><h2>Review published content</h2><p>Open the administrator workspace to inspect posts and comments, remove content, and write feedback for the author.</p><a className="button button--primary" href="/admin/">Open administrator workspace <Icon icon={arrowRightIcon} aria-hidden="true"/></a></div><ol><li><span>1</span><div><strong>Review context</strong><p>Read the full post or comment before deciding.</p></div></li><li><span>2</span><div><strong>Choose a clear reason</strong><p>Explain the specific guideline problem.</p></div></li><li><span>3</span><div><strong>Send useful feedback</strong><p>The author can revise and immediately republish.</p></div></li></ol></div>
        </section>
    )
}

export function RemovedPostPage() {
    const {postId} = useParams<{postId: string}>()
    const id = Number(postId)
    const hasInvalidId = !Number.isInteger(id)
    const [post, setPost] = useState<AuthorPostDetail | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        if (hasInvalidId) return
        void getAuthorPost(id).then((response) => { if (!cancelled) setPost(response) }).catch((loadError: unknown) => { if (!cancelled) setError(getApiErrorMessage(loadError, 'Unable to load moderation feedback.')) })
        return () => { cancelled = true }
    }, [hasInvalidId, id])

    if (hasInvalidId) return <section className="app-shell community-page"><div className="app-alert app-alert--danger" role="alert">The post address is invalid.</div></section>
    if (error) return <section className="app-shell community-page"><div className="app-alert app-alert--danger" role="alert">{error}</div></section>
    if (!post) return <section className="app-shell community-page"><LoadingState label="Loading moderation feedback…"/></section>
    if (post.status !== 'removed') return <Navigate to={`/dashboard/posts/${post.id}/edit`} replace/>

    return (
        <section className="app-shell community-page removed-page"><div className="removed-summary"><div className="panel-icon"><Icon icon={shieldCheckIcon} aria-hidden="true"/></div><p className="section-eyebrow">Post removed</p><h1>Your idea is not lost.</h1><p>This post is hidden from readers, but you can edit it and republish immediately after fixing the issue.</p><div><Link className="button button--primary" to={`/dashboard/posts/${post.id}/edit`}><Icon icon={penLineIcon} aria-hidden="true"/>Revise post</Link><Link className="button button--secondary" to="/dashboard">Return to dashboard</Link></div></div><article className="moderation-feedback-card"><header><span>Moderation feedback</span><strong>{post.title}</strong></header><div><p className="content-label">Why it was removed</p><blockquote>{post.review_feedback || 'Review the community guidelines before republishing this post.'}</blockquote><h2>What to do next</h2><ol><li><span>1</span>Open the post editor.</li><li><span>2</span>Fix the issue described above.</li><li><span>3</span>Select “Save and republish.”</li></ol><Link to="/guidelines">Read the community guidelines <Icon icon={arrowRightIcon} aria-hidden="true"/></Link></div></article></section>
    )
}

export function OfflineStatePage() {
    return <section className="app-shell community-page"><div className="empty-state"><Icon icon={wifiOffIcon} aria-hidden="true"/><h1>ThoughtHub cannot connect</h1><p>Check your internet connection, then retry. Save editor changes before leaving a page whenever the connection is unstable.</p><button className="button button--primary" type="button" onClick={() => window.location.reload()}>Try again</button></div></section>
}
