import {Icon} from '@iconify/react'
import arrowLeftIcon from '@iconify-icons/lucide/arrow-left'
import arrowRightIcon from '@iconify-icons/lucide/arrow-right'
import bellIcon from '@iconify-icons/lucide/bell'
import bookmarkIcon from '@iconify-icons/lucide/bookmark'
import checkIcon from '@iconify-icons/lucide/check'
import codeIcon from '@iconify-icons/lucide/code-2'
import compassIcon from '@iconify-icons/lucide/compass'
import cpuIcon from '@iconify-icons/lucide/cpu'
import graduationCapIcon from '@iconify-icons/lucide/graduation-cap'
import helpCircleIcon from '@iconify-icons/lucide/help-circle'
import keyRoundIcon from '@iconify-icons/lucide/key-round'
import lifeBuoyIcon from '@iconify-icons/lucide/life-buoy'
import lockIcon from '@iconify-icons/lucide/lock-keyhole'
import mailIcon from '@iconify-icons/lucide/mail'
import messageIcon from '@iconify-icons/lucide/message-circle'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import searchIcon from '@iconify-icons/lucide/search'
import shieldCheckIcon from '@iconify-icons/lucide/shield-check'
import userIcon from '@iconify-icons/lucide/user'
import usersIcon from '@iconify-icons/lucide/users'
import wifiOffIcon from '@iconify-icons/lucide/wifi-off'
import {useEffect, useMemo, useState, type FormEvent} from 'react'
import {Link, Navigate, useParams, useSearchParams} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {
    getAuthorPost,
    getPublishedPosts,
    type AuthorPostDetail,
    type PublicPostListItem,
} from '../api/posts'
import {useAuth} from '../auth/useAuth'
import {SavedPostButton} from '../components/SavedPostButton'
import {applyTheme, type Theme} from '../theme'
import {useSavedPosts} from '../useSavedPosts'
import {useNotifications} from '../useNotifications'

const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'})

function formatDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function useFirstPublishedPage() {
    const [posts, setPosts] = useState<PublicPostListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        void getPublishedPosts().then((response) => {
            if (!cancelled) setPosts(response.results)
        }).catch((loadError: unknown) => {
            if (!cancelled) setError(getApiErrorMessage(loadError, 'Unable to load posts.'))
        }).finally(() => {
            if (!cancelled) setIsLoading(false)
        })

        return () => { cancelled = true }
    }, [])

    return {posts, isLoading, error}
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
                            <span className="content-label">{post.category?.name ?? post.post_type}</span>
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
    const {posts, isLoading, error} = useFirstPublishedPage()
    const authorPosts = posts.filter((post) => post.author_username === username)
    const isOwnProfile = user?.username === username
    const displayName = isOwnProfile
        ? [user.first_name, user.last_name].filter(Boolean).join(' ') || username
        : username
    const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    const [isFollowing, setIsFollowing] = useState(false)

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
                        {isOwnProfile ? (
                            <Link className="button button--secondary" to="/settings">Edit profile</Link>
                        ) : (
                            <button
                                className="button button--primary"
                                type="button"
                                aria-pressed={isFollowing}
                                onClick={() => setIsFollowing((value) => !value)}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <p className="profile-bio">University student sharing ideas, lessons, and useful perspectives with the ThoughtHub community.</p>
                    <div className="profile-details">
                        <span><Icon icon={graduationCapIcon} aria-hidden="true"/> University student</span>
                        <span><Icon icon={penLineIcon} aria-hidden="true"/> {authorPosts.length} published posts</span>
                    </div>
                </div>
            </header>

            <div className="profile-stats" aria-label="Profile activity">
                <div><strong>{authorPosts.length}</strong><span>Posts</span></div>
                <div><strong>{authorPosts.reduce((total, post) => total + post.reading_time, 0)}</strong><span>Minutes of reading</span></div>
                <div><strong>{new Set(authorPosts.flatMap((post) => post.tags.map((tag) => tag.slug))).size}</strong><span>Topics</span></div>
            </div>

            <div className="section-heading"><div><p className="section-eyebrow">Latest writing</p><h2>Posts by {displayName}</h2></div></div>
            {isLoading ? <LoadingState label="Loading this student’s posts…"/> : error ? <div className="app-alert app-alert--danger" role="alert">{error}</div> : authorPosts.length > 0 ? <PostRows posts={authorPosts}/> : (
                <div className="empty-state"><Icon icon={penLineIcon} aria-hidden="true"/><h2>No published posts yet</h2><p>When {displayName} publishes a thought, it will appear here.</p>{isOwnProfile && <Link className="button button--primary" to="/dashboard/posts/new">Write your first post</Link>}</div>
            )}
        </section>
    )
}

export function TopicPage() {
    const {topic = 'technology'} = useParams<{topic: string}>()
    const {posts, isLoading, error} = useFirstPublishedPage()
    const [sort, setSort] = useState<'latest' | 'reading'>('latest')
    const label = topic.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
    const matchingPosts = useMemo(() => {
        const normalized = topic.toLowerCase()
        const filtered = posts.filter((post) =>
            post.category?.slug === normalized ||
            post.tags.some((tag) => tag.slug === normalized) ||
            post.post_type === normalized,
        )
        const result = filtered.length > 0 ? filtered : posts
        return sort === 'reading' ? [...result].sort((a, b) => b.reading_time - a.reading_time) : result
    }, [posts, sort, topic])

    return (
        <section className="app-shell community-page topic-page">
            <header className="topic-hero">
                <div className="topic-hero__icon"><Icon icon={cpuIcon} aria-hidden="true"/></div>
                <div><p className="section-eyebrow">Topic</p><h1>{label}</h1><p>Ideas, tutorials, projects, and honest lessons from students learning together.</p><div className="topic-hero__meta"><span>{matchingPosts.length} posts on this page</span><span>Updated with the latest writing</span></div></div>
            </header>
            <div className="content-toolbar"><div className="segmented-control"><button type="button" aria-pressed={sort === 'latest'} onClick={() => setSort('latest')}>Latest</button><button type="button" aria-pressed={sort === 'reading'} onClick={() => setSort('reading')}>Long reads</button></div><Link to="/search" className="quiet-link"><Icon icon={searchIcon} aria-hidden="true"/> Search this topic</Link></div>
            {isLoading ? <LoadingState label="Loading topic posts…"/> : error ? <div className="app-alert app-alert--danger" role="alert">{error}</div> : <PostRows posts={matchingPosts}/>} 
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
            <header className="page-intro"><p className="section-eyebrow">Search ThoughtHub</p><h1>Find an idea worth reading.</h1></header>
            <form className="search-page__form" role="search" onSubmit={handleSubmit}><Icon icon={searchIcon} aria-hidden="true"/><label className="visually-hidden" htmlFor="thought-search">Search posts</label><input id="thought-search" type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search posts, people, or topics" autoFocus/><span className="search-page__live-status" aria-live="polite">{isLoading ? 'Searching…' : 'Live results'}</span></form>
            <div className="search-page__summary"><p><strong>{resultCount} {resultCount === 1 ? 'result' : 'results'}</strong>{query && <> for “{query}”</>}</p><div className="segmented-control"><button type="button" aria-pressed="true">Posts</button><Link to="/topics/technology">Browse topics</Link></div></div>
            {isLoading && !resultsPage ? <LoadingState label="Searching ThoughtHub…"/> : error ? <div className="app-alert app-alert--danger" role="alert">{error}</div> : results.length > 0 ? <><PostRows posts={results}/>{(resultsPage?.previous || resultsPage?.next) && <nav className="pagination-bar" aria-label="Search result pages"><button className="button button--secondary" type="button" disabled={!resultsPage.previous} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page}</span><button className="button button--secondary" type="button" disabled={!resultsPage.next} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}</> : <div className="empty-state"><Icon icon={searchIcon} aria-hidden="true"/><h2>No results yet</h2><p>Try a shorter phrase, check the spelling, or explore a popular topic instead.</p><Link className="button button--secondary" to="/topics/technology">Explore Technology</Link></div>}
        </section>
    )
}

export function SavedPostsPage() {
    const {savedPosts, isLoading, error} = useSavedPosts()

    return (
        <section className="app-shell community-page saved-page">
            <header className="page-intro"><p className="section-eyebrow">Your reading list</p><h1>Saved posts</h1><p>Saved to your ThoughtHub account and available on every device.</p></header>
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

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'privacy'

export function SettingsPage() {
    const {user} = useAuth()
    const [tab, setTab] = useState<SettingsTab>('profile')
    const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    const [feedback, setFeedback] = useState('')

    if (!user) return <Navigate to="/login" replace/>

    const savePreferences = () => {
        try {
            window.localStorage.setItem('thoughthub-interface-preferences', JSON.stringify({theme, tab}))
        } catch {
            // Preferences still apply to the active session.
        }
        setFeedback('Your interface preferences have been saved on this device.')
    }

    return (
        <section className="app-shell community-page settings-page">
            <header className="page-intro"><p className="section-eyebrow">Your account</p><h1>Settings</h1><p>Manage how you appear and how ThoughtHub works for you.</p></header>
            <div className="settings-layout">
                <aside className="settings-nav" aria-label="Settings sections">
                    <button type="button" aria-pressed={tab === 'profile'} onClick={() => setTab('profile')}><Icon icon={userIcon} aria-hidden="true"/>Profile</button>
                    <button type="button" aria-pressed={tab === 'appearance'} onClick={() => setTab('appearance')}><Icon icon={compassIcon} aria-hidden="true"/>Appearance</button>
                    <button type="button" aria-pressed={tab === 'notifications'} onClick={() => setTab('notifications')}><Icon icon={bellIcon} aria-hidden="true"/>Notifications</button>
                    <button type="button" aria-pressed={tab === 'privacy'} onClick={() => setTab('privacy')}><Icon icon={lockIcon} aria-hidden="true"/>Privacy</button>
                </aside>
                <div className="settings-panel">
                    {tab === 'profile' && <><div className="settings-panel__heading"><div><h2>Public profile</h2><p>Your core account details are shown below.</p></div></div><div className="profile-account-summary"><div className="profile-avatar" aria-hidden="true">{`${user.first_name[0] ?? ''}${user.last_name[0] ?? user.username[0]}`.toUpperCase()}</div><div><strong>{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}</strong><span>@{user.username}</span><span>{user.email}</span></div></div><div className="settings-notice"><Icon icon={shieldCheckIcon} aria-hidden="true"/><p>Account identity is managed securely by Django. Profile biography and university fields will become editable when the profile endpoint is added.</p></div><Link className="button button--secondary" to={`/profile/${user.username}`}>View public profile</Link></>}
                    {tab === 'appearance' && <><div className="settings-panel__heading"><div><h2>Appearance</h2><p>Use either of ThoughtHub’s existing themes.</p></div></div><fieldset className="theme-options"><legend>Theme preference</legend><label><input type="radio" name="theme" checked={theme === 'light'} onChange={() => {setTheme('light'); applyTheme('light')}}/><span><strong>Light</strong><small>Use ThoughtHub’s existing light theme.</small></span></label><label><input type="radio" name="theme" checked={theme === 'dark'} onChange={() => {setTheme('dark'); applyTheme('dark')}}/><span><strong>Dark</strong><small>Use ThoughtHub’s existing dark theme.</small></span></label></fieldset><button className="button button--primary" type="button" onClick={savePreferences}>Save preferences</button></>}
                    {tab === 'notifications' && <><div className="settings-panel__heading"><div><h2>Notifications</h2><p>Choose which future activity deserves your attention.</p></div></div><label className="setting-toggle"><span><strong>Comments on my posts</strong><small>When someone joins a discussion you started.</small></span><input type="checkbox" defaultChecked/></label><label className="setting-toggle"><span><strong>Replies to my comments</strong><small>When a student responds directly to you.</small></span><input type="checkbox" defaultChecked/></label><label className="setting-toggle"><span><strong>Moderation feedback</strong><small>Important updates when content is removed.</small></span><input type="checkbox" defaultChecked disabled/></label><button className="button button--primary settings-save" type="button" onClick={savePreferences}>Save preferences</button></>}
                    {tab === 'privacy' && <><div className="settings-panel__heading"><div><h2>Privacy</h2><p>ThoughtHub publishes your username with posts and comments.</p></div></div><label className="setting-toggle"><span><strong>Allow new followers</strong><small>Students can follow your public writing after the follow service launches.</small></span><input type="checkbox" defaultChecked/></label><label className="setting-toggle"><span><strong>Show saved posts</strong><small>Your device-only reading list remains private.</small></span><input type="checkbox" disabled/></label><button className="button button--primary settings-save" type="button" onClick={savePreferences}>Save preferences</button></>}
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
            <div className="document-layout"><aside><strong>On this page</strong><a href="#principles">Our principles</a><a href="#publish">What you can publish</a><a href="#remove">When content is removed</a><a href="#feedback">Feedback and revision</a><a href="#report">Reporting content</a></aside><div className="document-content">
                <section id="principles"><span>01</span><h2>Our principles</h2><p>ThoughtHub is built for curiosity, honest experience, and useful disagreement. Students can publish immediately without waiting for approval.</p><div className="principle-grid"><div><Icon icon={messageIcon} aria-hidden="true"/><h3>Be human</h3><p>Write to people, not at them.</p></div><div><Icon icon={penLineIcon} aria-hidden="true"/><h3>Be original</h3><p>Share your thinking and credit sources.</p></div><div><Icon icon={shieldCheckIcon} aria-hidden="true"/><h3>Be responsible</h3><p>Protect privacy and avoid harm.</p></div></div></section>
                <section id="publish"><span>02</span><h2>What you can publish</h2><p>Technology notes, tutorials, campus experiences, opinions, project stories, creative work, and personal reflections are welcome.</p><ul><li>Make it clear when something is your opinion.</li><li>Credit quotations, research, images, and borrowed ideas.</li><li>Ask permission before sharing another person’s private story.</li><li>Disagree with ideas without attacking the person.</li></ul></section>
                <section id="remove"><span>03</span><h2>When content is removed</h2><p>Administrators may remove posts or comments containing harassment, private information, impersonation, dangerous instructions, spam, or copied work presented as original.</p><div className="document-note"><Icon icon={shieldCheckIcon} aria-hidden="true"/><p>Removal does not lock the author out. The author receives a reason and can revise and immediately republish after fixing the issue.</p></div></section>
                <section id="feedback"><span>04</span><h2>Feedback and revision</h2><p>Moderation feedback should identify the problem, explain the relevant guideline, and suggest what the author can change. It should never shame the student.</p></section>
                <section id="report"><span>05</span><h2>Reporting content</h2><p>Report a post or comment when it may break these guidelines. Reports are private and do not automatically remove content.</p><Link className="button button--secondary" to="/help">Ask a guidelines question</Link></section>
            </div></div>
        </section>
    )
}

export function HelpCenterPage() {
    const categories = [
        {icon: penLineIcon, title: 'Writing and publishing', text: 'Create posts, use content blocks, save drafts, and publish.'},
        {icon: userIcon, title: 'Account and profile', text: 'Sign in, reset a password, and understand your public profile.'},
        {icon: shieldCheckIcon, title: 'Moderation and feedback', text: 'Understand removals, revise content, and report a concern.'},
        {icon: usersIcon, title: 'Comments and community', text: 'Join discussions and manage your contributions.'},
    ]
    return (
        <section className="app-shell community-page help-page">
            <header className="help-hero"><p className="section-eyebrow">Help center</p><h1>What can we help with?</h1><label><Icon icon={searchIcon} aria-hidden="true"/><span className="visually-hidden">Search help articles</span><input type="search" placeholder="Search help articles"/></label></header>
            <div className="help-category-grid">{categories.map((category) => <article key={category.title}><Icon icon={category.icon} aria-hidden="true"/><div><h2>{category.title}</h2><p>{category.text}</p><span>Read help <Icon icon={arrowRightIcon} aria-hidden="true"/></span></div></article>)}</div>
            <section className="faq-section"><div className="section-heading"><div><p className="section-eyebrow">Quick answers</p><h2>Frequently asked</h2></div></div><details open><summary>Does my post need approval before publishing?</summary><p>No. Posts and comments publish immediately. Administrators can remove content later if it breaks the community guidelines.</p></details><details><summary>Can I republish a removed post?</summary><p>Yes. Open the moderation feedback, revise the issue, and republish immediately.</p></details><details><summary>Why can’t I sign in?</summary><p>Check your username and password first. If the problem continues, password recovery requires an email service to be connected.</p></details><details><summary>Where can I see moderation feedback?</summary><p>Your dashboard shows feedback beside removed posts and comments.</p></details></section>
            <div className="support-strip"><div><Icon icon={lifeBuoyIcon} aria-hidden="true"/><span><strong>Still need help?</strong><small>Include the page where the problem happened.</small></span></div><a className="button button--primary" href="mailto:support@thoughthub.local">Contact support</a></div>
        </section>
    )
}

export function PasswordRecoveryPage() {
    const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'complete'>('request')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')

    function requestReset(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!email.trim() || !email.includes('@')) { setError('Enter a complete email address.'); return }
        setError('')
        setStep('sent')
    }

    function updatePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (password.length < 8) { setError('Use at least 8 characters.'); return }
        if (password !== confirm) { setError('The passwords do not match.'); return }
        setError('')
        setStep('complete')
    }

    return (
        <section className="app-shell community-page recovery-page">
            <aside className="recovery-journey"><p className="section-eyebrow">Account recovery</p><h1>A clear way back to your account.</h1><p>We will guide you through each step and never ask for your current password.</p><ol><li data-active={step === 'request'} data-complete={step !== 'request'}><span>1</span><div><strong>Find your account</strong><small>Enter your ThoughtHub email.</small></div></li><li data-active={step === 'sent'} data-complete={step === 'reset' || step === 'complete'}><span>2</span><div><strong>Check your email</strong><small>Open the secure reset link.</small></div></li><li data-active={step === 'reset'} data-complete={step === 'complete'}><span>3</span><div><strong>Create a password</strong><small>Choose a fresh password.</small></div></li></ol><div className="settings-notice"><Icon icon={shieldCheckIcon} aria-hidden="true"/><p>The recovery screens are implemented. Sending real reset links still requires a backend email endpoint.</p></div></aside>
            <div className="recovery-panel">
                {step === 'request' && <><div className="panel-icon"><Icon icon={keyRoundIcon} aria-hidden="true"/></div><p className="section-eyebrow">Step 1 of 3</p><h2>Forgot your password?</h2><p>Enter your account email to continue through the recovery flow.</p>{error && <div className="app-alert app-alert--danger" role="alert">{error}</div>}<form onSubmit={requestReset}><label className="field"><span>Email address</span><div className="field-control"><Icon icon={mailIcon} aria-hidden="true"/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com"/></div></label><button className="button button--primary button--block" type="submit">Continue <Icon icon={arrowRightIcon} aria-hidden="true"/></button></form><p className="panel-bottom-link">Remembered it? <Link to="/login">Return to sign in</Link></p></>}
                {step === 'sent' && <><div className="panel-icon"><Icon icon={mailIcon} aria-hidden="true"/></div><p className="section-eyebrow">Step 2 of 3</p><h2>Check your inbox</h2><p>A production system would now send a one-use link to <strong>{email}</strong>.</p><div className="recovery-demo-note"><Icon icon={helpCircleIcon} aria-hidden="true"/><p>For this frontend implementation, preview the secure link to review the next screen.</p></div><button className="button button--primary button--block" type="button" onClick={() => setStep('reset')}>Preview secure reset <Icon icon={arrowRightIcon} aria-hidden="true"/></button><button className="quiet-button" type="button" onClick={() => setStep('request')}><Icon icon={arrowLeftIcon} aria-hidden="true"/>Use a different email</button></>}
                {step === 'reset' && <><div className="panel-icon"><Icon icon={lockIcon} aria-hidden="true"/></div><p className="section-eyebrow">Step 3 of 3</p><h2>Create a new password</h2><p>Choose something memorable that you have not used before.</p>{error && <div className="app-alert app-alert--danger" role="alert">{error}</div>}<form onSubmit={updatePassword}><label className="field"><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password"/></label><label className="field"><span>Confirm new password</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password"/></label><button className="button button--primary button--block" type="submit">Update password</button></form></>}
                {step === 'complete' && <div className="recovery-complete"><div className="panel-icon"><Icon icon={checkIcon} aria-hidden="true"/></div><p className="section-eyebrow">Flow complete</p><h2>Password screen confirmed</h2><p>The frontend journey is complete. A backend reset endpoint is required before passwords can actually change.</p><Link className="button button--primary button--block" to="/login">Continue to sign in</Link></div>}
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
            <header className="page-intro"><p className="section-eyebrow">Administrator</p><h1>Moderation</h1><p>ThoughtHub already connects moderation actions through Django Admin.</p></header>
            <div className="moderation-overview"><div><Icon icon={shieldCheckIcon} aria-hidden="true"/><h2>Review reported content</h2><p>Open the administrator workspace to inspect posts and comments, remove content, and write feedback for the author.</p><a className="button button--primary" href="/admin/">Open Django Admin <Icon icon={arrowRightIcon} aria-hidden="true"/></a></div><ol><li><span>1</span><div><strong>Review context</strong><p>Read the full post or comment before deciding.</p></div></li><li><span>2</span><div><strong>Choose a clear reason</strong><p>Explain the specific guideline problem.</p></div></li><li><span>3</span><div><strong>Send useful feedback</strong><p>The author can revise and immediately republish.</p></div></li></ol></div>
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
    return <section className="app-shell community-page"><div className="empty-state"><Icon icon={wifiOffIcon} aria-hidden="true"/><h1>ThoughtHub cannot connect</h1><p>Check your internet connection. Unsaved editor work should remain in the browser while you reconnect.</p><button className="button button--primary" type="button" onClick={() => window.location.reload()}>Try again</button></div></section>
}
