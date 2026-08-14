import {Icon} from '@iconify/react'
import bellIcon from '@iconify-icons/lucide/bell'
import bookmarkIcon from '@iconify-icons/lucide/bookmark'
import chevronDownIcon from '@iconify-icons/lucide/chevron-down'
import menuIcon from '@iconify-icons/lucide/menu'
import penLineIcon from '@iconify-icons/lucide/pen-line'
import searchIcon from '@iconify-icons/lucide/search'
import xIcon from '@iconify-icons/lucide/x'
import {useEffect, useRef, useState, type FormEvent} from 'react'
import {
    Link,
    NavLink,
    useLocation,
    useNavigate,
} from 'react-router-dom'

import {getApiErrorMessage} from '../api/errors'
import {useAuth} from '../auth/useAuth'
import {useNotifications} from '../useNotifications'
import {ThemeToggle} from './ThemeToggle'
import {ThoughtHubIcon} from './ThoughtHubIcon'

export function AppNavbar() {
    const {
        user,
        isAuthenticated,
        isInitializing,
        logout,
    } = useAuth()
    const {unreadCount} = useNotifications()
    const navigate = useNavigate()
    const location = useLocation()

    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [logoutError, setLogoutError] =
        useState<string | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const profileMenuRef = useRef<HTMLDivElement>(null)
    const [searchInput, setSearchInput] = useState(() =>
        new URLSearchParams(location.search).get('q') ?? '',
    )

    const displayName = user?.first_name.trim() || user?.username
    const initials = `${user?.first_name?.[0] ?? ''}${
        user?.last_name?.[0] ?? user?.username?.[0] ?? ''
    }`.toUpperCase()

    useEffect(() => {
        if (location.pathname !== '/search') {
            return
        }

        const timeoutId = window.setTimeout(() => {
            setSearchInput(
                new URLSearchParams(location.search).get('q') ?? '',
            )
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [location.pathname, location.search])

    useEffect(() => {
        if (location.pathname !== '/search') {
            return
        }

        const nextQuery = searchInput.trim()
        const currentQuery =
            new URLSearchParams(location.search).get('q') ?? ''

        if (nextQuery === currentQuery) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            const nextPath = nextQuery
                ? `/search?q=${encodeURIComponent(nextQuery)}`
                : '/search'
            navigate(nextPath, {
                replace: location.pathname === '/search',
            })
        }, 300)

        return () => window.clearTimeout(timeoutId)
    }, [location.pathname, location.search, navigate, searchInput])

    useEffect(() => {
        function closeProfileMenu(event: MouseEvent) {
            if (
                profileMenuRef.current &&
                !profileMenuRef.current.contains(event.target as Node)
            ) {
                setIsProfileMenuOpen(false)
            }
        }

        function closeProfileMenuWithKeyboard(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsProfileMenuOpen(false)
            }
        }

        document.addEventListener('click', closeProfileMenu)
        document.addEventListener('keydown', closeProfileMenuWithKeyboard)

        return () => {
            document.removeEventListener('click', closeProfileMenu)
            document.removeEventListener('keydown', closeProfileMenuWithKeyboard)
        }
    }, [])

    function closeMenu() {
        setIsMenuOpen(false)
        setIsProfileMenuOpen(false)
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const nextQuery = searchInput.trim()
        navigate(
            nextQuery
                ? `/search?q=${encodeURIComponent(nextQuery)}`
                : '/search',
        )
        closeMenu()
    }

    async function handleLogout() {
        setLogoutError(null)
        setIsLoggingOut(true)

        try {
            await logout()
            closeMenu()
            navigate('/', {replace: true})
        } catch (error) {
            setLogoutError(
                getApiErrorMessage(error, 'Unable to log out.'),
            )
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <header className="app-header">
            <nav className="app-navbar" aria-label="Primary navigation">
                <div className="app-navbar__inner">
                    <Link
                        className="app-brand"
                        to="/"
                        aria-label="ThoughtHub"
                        onClick={closeMenu}
                    >
                        <ThoughtHubIcon className="app-brand__mark"/>
                        <span>ThoughtHub</span>
                    </Link>

                    <div className="app-navbar__links">
                        <NavLink
                            className={({isActive}) =>
                                `app-nav-link ${isActive ? 'active' : ''}`
                            }
                            to="/"
                            end
                        >
                            <span className="app-nav-home-label">Home</span>
                            <span className="app-nav-explore-label" aria-hidden="true">Explore</span>
                        </NavLink>
                        <NavLink
                            className={({isActive}) =>
                                `app-nav-link ${isActive ? 'active' : ''}`
                            }
                            to="/categories"
                        >
                            Categories
                        </NavLink>
                        {isAuthenticated && (
                            <NavLink
                                className={({isActive}) =>
                                    `app-nav-link ${isActive ? 'active' : ''}`
                                }
                                to="/dashboard"
                            >
                                Dashboard
                            </NavLink>
                        )}
                        {user?.is_staff && (
                            <NavLink
                                className={({isActive}) =>
                                    `app-nav-link ${isActive ? 'active' : ''}`
                                }
                                to="/moderation"
                            >
                                Moderation
                            </NavLink>
                        )}
                    </div>

                    <form
                        className="app-navbar__search"
                        role="search"
                        onSubmit={submitSearch}
                    >
                        <Icon icon={searchIcon} aria-hidden="true"/>
                        <label className="visually-hidden" htmlFor="navbar-search">
                            Search published posts by title, author, category, or tag
                        </label>
                        <input
                            id="navbar-search"
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search posts"
                        />
                    </form>

                    <div className="app-navbar__actions">
                        {isInitializing ? (
                            <span className="app-session-status" role="status">
                                Checking session…
                            </span>
                        ) : isAuthenticated && user ? (
                            <>
                                <Link
                                    className="app-write-button"
                                    to="/dashboard/posts/new"
                                    aria-label="Write a post"
                                >
                                    <Icon icon={penLineIcon} aria-hidden="true"/>
                                    <span>Write</span>
                                </Link>
                                <Link
                                    className="app-icon-button app-saved-button"
                                    to="/saved"
                                    aria-label="Saved posts"
                                >
                                    <Icon icon={bookmarkIcon} aria-hidden="true"/>
                                </Link>
                                <Link
                                    className="app-icon-button app-notification-button"
                                    to="/notifications"
                                    aria-label={
                                        unreadCount > 0
                                            ? `Notifications, ${unreadCount} unread`
                                            : 'Notifications'
                                    }
                                >
                                    <Icon icon={bellIcon} aria-hidden="true"/>
                                    {unreadCount > 0 && (
                                        <span aria-hidden="true">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Link>
                                <ThemeToggle/>
                                <div className="app-profile-menu" ref={profileMenuRef}>
                                    <button
                                        className="app-user-button"
                                        type="button"
                                        aria-label={`Open ${displayName}'s profile menu`}
                                        aria-expanded={isProfileMenuOpen}
                                        aria-controls="app-profile-menu-panel"
                                        onClick={() => setIsProfileMenuOpen((current) => !current)}
                                    >
                                        <span aria-hidden="true">{initials || 'TH'}</span>
                                        <strong>{displayName}</strong>
                                        <Icon
                                            className="app-user-button__chevron"
                                            icon={chevronDownIcon}
                                            aria-hidden="true"
                                        />
                                    </button>
                                    {isProfileMenuOpen && (
                                        <nav
                                            className="app-profile-menu__panel"
                                            id="app-profile-menu-panel"
                                            aria-label="Profile menu"
                                        >
                                            <div className="app-profile-menu__identity">
                                                <strong>{displayName}</strong>
                                                <span>@{user.username}</span>
                                            </div>
                                            <Link
                                                to={`/profile/${user.username}`}
                                                onClick={() => setIsProfileMenuOpen(false)}
                                            >
                                                View profile
                                            </Link>
                                            <Link
                                                to="/settings"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                            >
                                                Settings
                                            </Link>
                                            <button
                                                type="button"
                                                disabled={isLoggingOut}
                                                onClick={() => void handleLogout()}
                                            >
                                                {isLoggingOut ? 'Logging out…' : 'Log out'}
                                            </button>
                                        </nav>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <ThemeToggle/>
                                <Link className="app-login-link" to="/login">
                                    Log in
                                </Link>
                                <Link className="app-signup-link" to="/register">
                                    Create account
                                </Link>
                            </>
                        )}

                        <button
                            className="app-menu-button"
                            type="button"
                            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
                            aria-expanded={isMenuOpen}
                            onClick={() => setIsMenuOpen((current) => !current)}
                        >
                            <Icon icon={isMenuOpen ? xIcon : menuIcon} aria-hidden="true"/>
                        </button>
                    </div>
                </div>

                {isMenuOpen && (
                    <div className="app-mobile-menu">
                        <form
                            className="app-mobile-search"
                            role="search"
                            onSubmit={submitSearch}
                        >
                            <Icon icon={searchIcon} aria-hidden="true"/>
                            <label className="visually-hidden" htmlFor="mobile-navbar-search">
                                Search published posts by title, author, category, or tag
                            </label>
                            <input
                                id="mobile-navbar-search"
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search posts"
                            />
                        </form>
                        <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
                        <NavLink to="/categories" onClick={closeMenu}>Categories and tags</NavLink>
                        {isAuthenticated ? (
                            <>
                                <NavLink to="/dashboard" onClick={closeMenu}>Dashboard</NavLink>
                                <NavLink to="/saved" onClick={closeMenu}>Saved posts</NavLink>
                                <NavLink to="/notifications" onClick={closeMenu}>Notifications</NavLink>
                                {user && (
                                    <NavLink to={`/profile/${user.username}`} onClick={closeMenu}>
                                        View profile
                                    </NavLink>
                                )}
                                <NavLink to="/settings" onClick={closeMenu}>Settings</NavLink>
                                {user?.is_staff && <NavLink to="/moderation" onClick={closeMenu}>Moderation</NavLink>}
                                <button
                                    className="app-mobile-menu__logout"
                                    type="button"
                                    disabled={isLoggingOut}
                                    onClick={() => void handleLogout()}
                                >
                                    {isLoggingOut ? 'Logging out…' : 'Log out'}
                                </button>
                            </>
                        ) : (
                            <>
                                <NavLink to="/login" onClick={closeMenu}>Log in</NavLink>
                                <NavLink to="/register" onClick={closeMenu}>Create account</NavLink>
                            </>
                        )}
                    </div>
                )}
            </nav>

            {logoutError && (
                <div className="app-shell app-navbar-error">
                    <div className="app-alert app-alert--danger" role="alert">
                        {logoutError}
                    </div>
                </div>
            )}
        </header>
    )
}
